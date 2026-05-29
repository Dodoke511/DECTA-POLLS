const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase URL or service role key in env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching one row from 'form field' to inspect columns...");
  const { data, error } = await supabase.from('form field').select('*').limit(1);
  if (error) {
    console.error("Failed to select from 'form field':", error);
    return;
  }

  console.log("Columns in 'form field' row:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
  console.log("Sample row:", data[0]);
}

main().catch(console.error);
