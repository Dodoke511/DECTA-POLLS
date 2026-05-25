const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env!", { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Query a single row from tenants to see its keys
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('*')
    .limit(1);

  if (tenantErr) {
    console.error("Error fetching tenant:", tenantErr);
  } else {
    console.log("Tenant columns:", tenant && tenant[0] ? Object.keys(tenant[0]) : "No tenants found");
    console.log("Full tenant data:", tenant && tenant[0]);
  }

  // Also query one row from tenant users
  const { data: user, error: userErr } = await supabase
    .from('tenant users')
    .select('*')
    .limit(1);

  if (userErr) {
    console.error("Error fetching user:", userErr);
  } else {
    console.log("User columns:", user && user[0] ? Object.keys(user[0]) : "No users found");
  }
}

checkSchema();
