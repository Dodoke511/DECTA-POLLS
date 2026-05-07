import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  // Let's get the election ID first. Assuming slug is known, or let's just fetch all forms to see
  const { data: forms } = await supabase.from('forms').select('*');
  console.log("Forms:", forms);

  const { data: fields } = await supabase.from('form field').select('*');
  console.log("Form Fields:", fields);
}

checkData().catch(console.error);
