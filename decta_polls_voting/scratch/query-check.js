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

async function checkData() {
  // 1. Fetch tenants active_triggers
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, organization, active_triggers');
  
  console.log("--- Tenants ---");
  if (tenantErr) console.error("Error:", tenantErr);
  else console.log(JSON.stringify(tenants, null, 2));

  // 2. Fetch notifications count
  const { count, error: countErr } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  console.log(`\n--- Notifications Count: ${count} ---`);

  // 3. Fetch notifications (recent 10)
  const { data: notifications, error: notifErr } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log("\n--- Notifications (Recent 10) ---");
  if (notifErr) console.error("Error:", notifErr);
  else console.log(JSON.stringify(notifications, null, 2));
}

checkData();
