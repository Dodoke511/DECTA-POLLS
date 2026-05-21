import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { candidateId, status, removeFromOrg, retainAsVoter, userId } = await request.json();

    if (!candidateId || !status) {
      return NextResponse.json({ error: 'Missing candidateId or status' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update candidate status
    const { error: candError } = await supabase
      .from('candidate')
      .update({ status })
      .eq('id', candidateId);

    if (candError) {
      console.error('Update Candidate Error:', candError);
      return NextResponse.json({ error: candError.message }, { status: 500 });
    }

    // 2. If approved, fetch candidate, election, tenant & form response info to send Certificate
    if (status === 'APPROVED') {
      try {
        const { data: candidateInfo } = await supabase
          .from('candidate')
          .select(`
            id,
            userID,
            electionID,
            election:electionID ( id, title, tenantID ),
            user:userID ( id, first_name, surname, email )
          `)
          .eq('id', candidateId)
          .single();

        if (candidateInfo) {
          const userObj: any = Array.isArray(candidateInfo.user) ? candidateInfo.user[0] : candidateInfo.user;
          const email = userObj?.email;
          const firstName = userObj?.first_name || '';
          const surname = userObj?.surname || '';
          const fullName = `${firstName} ${surname}`.trim() || 'Candidate';

          const electionObj: any = Array.isArray(candidateInfo.election) ? candidateInfo.election[0] : candidateInfo.election;
          const electionTitle = electionObj?.title || 'Upcoming Election';
          const tenantID = electionObj?.tenantID;

          let tenantName = 'DECTA Polls';
          if (tenantID) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('organization')
              .eq('id', tenantID)
              .single();
            if (tenantData?.organization) {
              tenantName = tenantData.organization;
            }
          }

          let positionName = 'Candidate';
          const { data: form } = await supabase
            .from('forms')
            .select('id')
            .eq('electionID', candidateInfo.electionID)
            .eq('phaseName', 'candidate_application')
            .maybeSingle();

          if (form) {
            const { data: posField } = await supabase
              .from('form field')
              .select('id')
              .eq('formId', form.id)
              .eq('fieldType', 'position_selector')
              .maybeSingle();

            if (posField) {
              const { data: resp } = await supabase
                .from('form response')
                .select('id')
                .eq('formId', form.id)
                .eq('userID', candidateInfo.userID)
                .maybeSingle();

              if (resp) {
                const { data: val } = await supabase
                  .from('form response value')
                  .select('value')
                  .eq('responseID', resp.id)
                  .eq('fieldID', posField.id)
                  .maybeSingle();
                if (val?.value) {
                  positionName = val.value;
                }
              }
            }
          }

          if (email) {
            const userMail = process.env.EMAIL_USER;
            const passMail = process.env.EMAIL_PASS;
            if (userMail && passMail) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: userMail, pass: passMail }
              });

              const htmlContent = `
              <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; width: 100%; box-sizing: border-box;">
                <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                  
                  <!-- Header Banner -->
                  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 30px 40px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">DECTA Polls</h2>
                    <p style="color: #c7d2fe; margin: 5px 0 0 0; font-size: 12px; font-weight: 500;">Official Candidacy Verification</p>
                  </div>

                  <!-- Certificate Body Container -->
                  <div style="padding: 40px 50px; text-align: center; background-image: radial-gradient(circle, #f8fafc 10%, transparent 11%); background-size: 12px 12px;">
                    
                    <!-- Decorative Frame -->
                    <div style="border: 4px double #d4af37; padding: 30px; border-radius: 16px; background-color: #ffffff;">
                      
                      <p style="font-family: 'Georgia', serif; font-style: italic; color: #64748b; font-size: 16px; margin-bottom: 20px;">This serves as official verification that</p>
                      
                      <!-- Candidate Name -->
                      <h1 style="font-family: 'Georgia', serif; color: #1e1b4b; font-size: 32px; font-weight: bold; margin: 10px 0 5px 0; border-bottom: 2px solid #f1f5f9; display: inline-block; padding-bottom: 10px; width: 100%; max-width: 400px; text-transform: uppercase; letter-spacing: 1px;">
                        ${fullName}
                      </h1>
                      
                      <p style="font-family: 'Georgia', serif; font-style: italic; color: #64748b; font-size: 16px; margin-top: 20px; margin-bottom: 10px;">is an officially approved candidate for the position of</p>
                      
                      <!-- Position -->
                      <div style="background-color: #f5f3ff; color: #4f46e5; font-size: 18px; font-weight: 800; padding: 12px 24px; border-radius: 12px; display: inline-block; margin: 10px auto 20px auto; border: 1px solid #ddd6fe; letter-spacing: 0.5px; text-transform: uppercase;">
                        ${positionName}
                      </div>
                      
                      <p style="font-family: 'Georgia', serif; font-style: italic; color: #64748b; font-size: 16px; margin-bottom: 10px;">in the upcoming election</p>
                      
                      <!-- Election Title -->
                      <h3 style="color: #1e1b4b; font-size: 20px; font-weight: 700; margin: 5px 0 25px 0; font-family: 'Georgia', serif;">
                        "${electionTitle}"
                      </h3>

                      <!-- Seal Decor -->
                      <div style="margin: 20px auto; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #fef08a 0%, #d4af37 50%, #a16207 100%); border: 3px double #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: inline-block; position: relative;">
                        <span style="display: block; font-family: 'Georgia', serif; font-size: 8px; font-weight: 900; color: #ffffff; text-shadow: 1px 1px 2px rgba(0,0,0,0.4); margin-top: 33px; text-transform: uppercase; letter-spacing: 1.5px;">APPROVED</span>
                      </div>

                      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                        Presented by ${tenantName}
                      </p>

                    </div>
                  </div>

                  <!-- Email Footer -->
                  <div style="background-color: #f8fafc; padding: 25px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="color: #94a3b8; margin: 0; font-size: 11px; line-height: 1.6;">
                      This is an automated message sent from the <strong>DECTA Polls</strong> platform on behalf of <strong>${tenantName}</strong>.<br/>
                      Please do not reply directly to this email. If you have questions, contact your election administrator.
                    </p>
                  </div>

                </div>
              </div>
              `;

              await transporter.sendMail({
                from: `"DECTA Polls" <${userMail}>`,
                to: email,
                subject: 'Certificate of Candidacy Approved',
                html: htmlContent
              });
            } else {
              console.warn('EMAIL_USER and EMAIL_PASS not configured, skipping certificate email');
            }
          }
        }
      } catch (err) {
        console.error('Error sending candidacy certificate email:', err);
        // Do not crash the API request if only the email fails to send
      }
    }

    // 3. Handle Rejection Actions
    if (status === 'REJECTED' && userId) {
      if (removeFromOrg) {
        // Delete from tenant users
        await supabase.from('tenant users').delete().eq('id', userId);
      } else if (retainAsVoter) {
        // Change user_type to Voter
        await supabase.from('tenant users').update({ user_type: 'Voter' }).eq('id', userId);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
