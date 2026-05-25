const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Connecting to Supabase...");
  
  // 1. Check tenants
  const { data: tenants, error: tenantsErr } = await supabase.from('tenants').select('id, organization');
  console.log("Tenants:", tenantsErr ? tenantsErr : tenants);

  if (tenants && tenants.length > 0) {
    const tenantId = tenants[0].id;
    console.log(`Using Tenant ID: ${tenantId}`);

    // 2. Count notifications
    const { count: notifCount, error: notifCountErr } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    console.log(`Total notifications in database: ${notifCount} (error: ${notifCountErr?.message})`);

    // 3. Count notification reads
    const { count: readCount, error: readCountErr } = await supabase
      .from('notification_reads')
      .select('*', { count: 'exact', head: true });
    console.log(`Total notification_reads: ${readCount} (error: ${readCountErr?.message})`);

    // 4. Let's test a sample query
    console.log("Running sample notifications fetch...");
    const start = Date.now();
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at, election_id')
      .eq('tenant_id', tenantId)
      .limit(10);
    const duration = Date.now() - start;
    console.log(`Fetched ${data?.length} notifications in ${duration}ms`);
    if (error) console.error("Fetch error:", error);
  }
}

main();
