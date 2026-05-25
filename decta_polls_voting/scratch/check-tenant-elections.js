const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'c:/Users/DAYONOT/OneDrive/DECTA/DECTA-POLLS/decta_polls_voting/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantElections() {
  const tenantId = '7a31468c-c742-4d69-af1f-1a0f7b0ba7ef';

  // 1. Fetch elections for this tenant
  const { data: elections, error: electErr } = await supabase
    .from('election')
    .select('id, title, slug, status')
    .eq('tenantID', tenantId);

  console.log("--- USeeVotes Elections ---");
  if (electErr) console.error(electErr);
  else console.log(elections);

  if (elections && elections.length > 0) {
    const electionIds = elections.map(e => e.id);

    // 2. Fetch phases for these elections
    const { data: phases, error: phaseErr } = await supabase
      .from('election phase')
      .select('id, electionID, phase_type, completed_at, started_at, is_enabled')
      .in('electionID', electionIds)
      .order('phase_index', { ascending: true });

    console.log("\n--- USeeVotes Election Phases ---");
    if (phaseErr) console.error(phaseErr);
    else console.log(phases);

    // 3. Fetch notifications for this tenant
    const { data: notifications, error: notifErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId);

    console.log("\n--- USeeVotes Notifications ---");
    if (notifErr) console.error(notifErr);
    else console.log(notifications);
  }
}

checkTenantElections();
