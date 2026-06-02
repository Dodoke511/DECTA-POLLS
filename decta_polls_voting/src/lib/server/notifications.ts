import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { getDaysUntilExpiry } from '@/lib/subscription-limits';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize admin client to bypass RLS when inserting notifications or reading tenant tables
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Notifications] EMAIL_USER or EMAIL_PASS missing. Skipping email.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DECTA Polls" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`[Notifications] Failed to send email to ${to}:`, err);
  }
}

async function insertInAppNotification(
  tenantId: string,
  title: string,
  message: string,
  type: string,
  roleType: 'tenant_admin' | 'candidate' | 'voter' | 'all',
  userId?: string | null,
  electionId?: string | null
) {
  const { error } = await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    election_id: electionId || null,
    user_id: userId || null,
    role_type: roleType,
    title,
    message,
    type,
  });

  if (error) {
    console.error(`[Notifications] Failed to insert in-app notification for ${roleType}:`, error);
  }
}

export type NotificationType = 'Election Start' | 'Election End' | 'Candidate Added' | 'Results Published' | 'Vote Cast' | 'Subscription Expiry Warning';

interface TriggerOptions {
  candidateId?: string;
  voterId?: string;
  votePayloadCount?: number;
}

export async function triggerNotification(
  type: NotificationType,
  tenantId: string,
  electionId: string,
  options?: TriggerOptions
) {
  try {
    console.log(`[Notifications] Trigger received for type: "${type}", tenant: ${tenantId}, election: ${electionId}`);

    // 1. Fetch Tenant configuration
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('active_triggers, organization, email')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error(`[Notifications] Failed to fetch tenant details:`, tenantError);
      return;
    }

    const activeTriggers = tenant.active_triggers || [];
    if (!activeTriggers.includes(type)) {
      console.log(`[Notifications] Trigger "${type}" is disabled for tenant: ${tenantId}.`);
      return;
    }

    // 2. Fetch Election details
    let electionTitle = 'Election';
    const { data: election } = await supabaseAdmin
      .from('election')
      .select('title')
      .eq('id', electionId)
      .single();

    if (election) {
      electionTitle = election.title;
    }

    // Standard email transporter configuration
    const sendMail = async (to: string, subject: string, html: string) => {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[Notifications] EMAIL_USER or EMAIL_PASS missing. Skipping email.");
        return;
      }
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        await transporter.sendMail({
          from: `"DECTA Polls" <${process.env.EMAIL_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`[Notifications] Email sent successfully to ${to}`);
      } catch (err) {
        console.error(`[Notifications] Failed to send email to ${to}:`, err);
      }
    };

    // Helper to insert in-app notification
    const insertInApp = async (
      roleType: 'tenant_admin' | 'candidate' | 'voter' | 'all',
      title: string,
      message: string,
      dbType: string,
      userId?: string | null
    ) => {
      const { error } = await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        election_id: electionId,
        user_id: userId || null,
        role_type: roleType,
        title,
        message,
        type: dbType,
      });
      if (error) {
        console.error(`[Notifications] Failed to insert in-app notification for ${roleType}:`, error);
      }
    };

    // 3. Process Triggers
    if (type === 'Candidate Added' && options?.candidateId) {
      // Find candidate name and user email
      const { data: candidateUser } = await supabaseAdmin
        .from('tenant users')
        .select('first_name, surname, email')
        .eq('id', options.candidateId)
        .single();

      if (candidateUser) {
        const candidateName = `${candidateUser.first_name || ''} ${candidateUser.surname || ''}`.trim() || 'A candidate';
        const candidateEmail = candidateUser.email;

        // Notify tenant admin
        await insertInApp(
          'tenant_admin',
          'New Candidate Registration',
          `A new candidate registration has been submitted by ${candidateName} for ${electionTitle}.`,
          'candidate_registered'
        );
        if (tenant.email) {
          await sendMail(
            tenant.email,
            'New Candidate Registered - DECTA Polls',
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
               <h2>New Candidate Registered</h2>
               <p>A new candidate, <strong>${candidateName}</strong>, has registered for the election <strong>${electionTitle}</strong>.</p>
               <p>Please log in to the Tenant Admin portal to review and screen their candidacy.</p>
             </div>`
          );
        }

        // Notify candidate
        await insertInApp(
          'candidate',
          'Candidacy Received',
          'Your candidacy registration has been received and is pending screening.',
          'candidate_registered',
          options.candidateId
        );
        if (candidateEmail) {
          await sendMail(
            candidateEmail,
            'Candidacy Application Received - DECTA Polls',
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
               <h2>Application Received</h2>
               <p>Dear ${candidateUser.first_name || 'Candidate'},</p>
               <p>Your application to register as a candidate for the election <strong>${electionTitle}</strong> has been successfully received.</p>
               <p>It is currently pending administrator screening.</p>
               <p>Thank you for participating!</p>
             </div>`
          );
        }
      }
    }

    else if (type === 'Vote Cast' && options?.voterId) {
      const { data: voter } = await supabaseAdmin
        .from('tenant users')
        .select('first_name, surname, email')
        .eq('id', options.voterId)
        .single();

      if (voter) {
        const voterEmail = voter.email;
        // In-app notification for voter
        await insertInApp(
          'voter',
          'Ballot Submitted',
          `Your ballot for ${electionTitle} has been recorded successfully.`,
          'vote_cast',
          options.voterId
        );

        if (voterEmail) {
          await sendMail(
            voterEmail,
            'Vote Cast Confirmation - DECTA Polls',
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
               <h2>Vote Received</h2>
               <p>Dear ${voter.first_name || 'Voter'},</p>
               <p>This email confirms that you have successfully cast your vote in the election <strong>${electionTitle}</strong>.</p>
               <p>Your vote has been recorded and tabulated securely.</p>
               <p>Thank you for making your voice heard!</p>
             </div>`
          );
        }
      }
    }

    else if (type === 'Election Start') {
      // In-app broadcast for all voters & candidates
      await insertInApp(
        'voter',
        'Voting Has Started',
        `Voting is now active for ${electionTitle}. Click "Vote Now" to participate!`,
        'election_start'
      );
      await insertInApp(
        'candidate',
        'Voting Has Started',
        `Voting has officially started for ${electionTitle}. Monitor your live tallies in the dashboard.`,
        'election_start'
      );

      // Email all voters eligible for this election via vote_tokens
      const { data: tokens } = await supabaseAdmin
        .from('vote_tokens')
        .select('voter_id, "tenant users"(email, first_name)')
        .eq('election_id', electionId);

      if (tokens) {
        const voters = tokens
          .map((t: any) => t['tenant users'])
          .filter((v: any) => v && v.email);

        for (let i = 0; i < voters.length; i += 10) {
          const batch = voters.slice(i, i + 10);
          await Promise.all(
            batch.map((v: any) =>
              sendMail(
                v.email,
                `Voting is Now Active: ${electionTitle} - DECTA Polls`,
                `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                   <h2>Voting is Now Active!</h2>
                   <p>Dear ${v.first_name || 'Voter'},</p>
                   <p>Voting has officially started for the election <strong>${electionTitle}</strong>.</p>
                   <p>Please log in to the portal to cast your ballot.</p>
                 </div>`
              )
            )
          );
        }
      }
    }

    else if (type === 'Election End') {
      // In-app broadcast for all roles
      await insertInApp(
        'voter',
        'Voting Closed',
        `Voting has ended for ${electionTitle}. Results will be published soon.`,
        'election_end'
      );
      await insertInApp(
        'candidate',
        'Voting Closed',
        `Voting has ended for ${electionTitle}. Results will be published soon.`,
        'election_end'
      );
      await insertInApp(
        'tenant_admin',
        'Voting Completed',
        `Voting has ended for ${electionTitle}. You can now compute and publish the final results.`,
        'election_end'
      );

      // Email all voters
      const { data: tokens } = await supabaseAdmin
        .from('vote_tokens')
        .select('voter_id, "tenant users"(email, first_name)')
        .eq('election_id', electionId);

      if (tokens) {
        const voters = tokens
          .map((t: any) => t['tenant users'])
          .filter((v: any) => v && v.email);

        for (let i = 0; i < voters.length; i += 10) {
          const batch = voters.slice(i, i + 10);
          await Promise.all(
            batch.map((v: any) =>
              sendMail(
                v.email,
                `Voting Closed: ${electionTitle} - DECTA Polls`,
                `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                   <h2>Voting Has Concluded</h2>
                   <p>Dear ${v.first_name || 'Voter'},</p>
                   <p>Voting has closed for <strong>${electionTitle}</strong>. We are now processing the results.</p>
                   <p>You will receive another notification once the official results are published.</p>
                 </div>`
              )
            )
          );
        }
      }
    }

    else if (type === 'Results Published') {
      // In-app broadcast
      await insertInApp(
        'voter',
        'Results Published',
        `The results for ${electionTitle} are now official and published. View them now!`,
        'results_published'
      );
      await insertInApp(
        'candidate',
        'Results Published',
        `The results for ${electionTitle} are now official and published. View them now!`,
        'results_published'
      );

      // Email all voters
      const { data: tokens } = await supabaseAdmin
        .from('vote_tokens')
        .select('voter_id, "tenant users"(email, first_name)')
        .eq('election_id', electionId);

      if (tokens) {
        const voters = tokens
          .map((t: any) => t['tenant users'])
          .filter((v: any) => v && v.email);

        for (let i = 0; i < voters.length; i += 10) {
          const batch = voters.slice(i, i + 10);
          await Promise.all(
            batch.map((v: any) =>
              sendMail(
                v.email,
                `Official Election Results Published: ${electionTitle} - DECTA Polls`,
                `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                   <h2>Official Results Published!</h2>
                   <p>Dear ${v.first_name || 'Voter'},</p>
                   <p>The official results for the election <strong>${electionTitle}</strong> have been published.</p>
                   <p>Please log in to the portal to view the final tallies and election winners.</p>
                 </div>`
              )
            )
          );
        }
      }
    }
  } catch (err) {
    console.error(`[Notifications] Exception caught in triggerNotification:`, err);
  }
}

export async function triggerSubscriptionExpiryWarning(tenantId: string, expiresAt: string) {
  try {
    const daysLeft = getDaysUntilExpiry(expiresAt);
    if (daysLeft === null || daysLeft <= 0) {
      return;
    }

    const expirationText = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('email, organization')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('[Notifications] Failed to fetch tenant for subscription warning:', tenantError);
      return;
    }

    const title = 'Subscription Renewal Reminder';
    const message = `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} on ${expirationText}. Renew now to avoid service restrictions.`;

    await insertInAppNotification(
      tenantId,
      title,
      message,
      'subscription_expiry_warning',
      'tenant_admin'
    );

    if (tenant.email) {
      await sendMail(
        tenant.email,
        'Subscription Renewal Reminder - DECTA Polls',
        `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
           <h2>Subscription Renewal Reminder</h2>
           <p>Dear ${tenant.organization || 'Tenant Admin'},</p>
           <p>Your DECTA Polls subscription expires in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> on <strong>${expirationText}</strong>.</p>
           <p>Please renew your subscription before the expiration date to keep your account active and avoid limitations.</p>
         </div>`
      );
    }
  } catch (err) {
    console.error('[Notifications] Failed to trigger subscription expiry warning:', err);
  }
}
