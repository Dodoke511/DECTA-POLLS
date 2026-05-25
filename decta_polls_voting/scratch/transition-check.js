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

async function checkRecentTransitions() {
  const { data: phases, error } = await supabase
    .from('election phase')
    .select('id, electionID, phase_type, completed_at, started_at')
    .is('completed_at', null)
    .neq('started_at', null);

  console.log("--- Currently Active Phases ---");
  console.log(phases);

  const { data: completedPhases, error2 } = await supabase
    .from('election phase')
    .select('id, electionID, phase_type, completed_at, started_at')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(5);

  console.log("\n--- Recently Completed Phases ---");
  console.log(completedPhases);
}

checkRecentTransitions();
