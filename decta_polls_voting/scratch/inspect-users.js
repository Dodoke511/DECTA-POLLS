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

  console.log("Fetching first page of users...");
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError);
    return;
  }

  console.log("Total users fetched on first page:", listData.users.length);
  
  const targetEmail = 'unknown000180@gmail.com';
  const foundUser = listData.users.find(u => u.email === targetEmail);
  if (foundUser) {
    console.log(`Found user ${targetEmail} on first page! ID:`, foundUser.id);
  } else {
    console.log(`User ${targetEmail} NOT found on first page!`);
    
    // Let's fetch all users by loop or by higher perPage
    console.log("Fetching with perPage: 1000...");
    const { data: allData, error: allError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (allError) {
      console.error("Failed to list all users:", allError);
      return;
    }
    console.log("Total users with perPage 1000:", allData.users.length);
    const foundUserAll = allData.users.find(u => u.email === targetEmail);
    if (foundUserAll) {
      console.log(`Found user ${targetEmail} with perPage 1000! ID:`, foundUserAll.id);
    } else {
      console.log(`User ${targetEmail} still NOT found!`);
    }
  }
}

main().catch(console.error);
