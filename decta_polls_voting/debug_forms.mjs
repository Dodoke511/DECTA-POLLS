import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  const formId = 'ff2c5051-8f69-43e4-a55e-25ccc3919492';
  const { data: fields, error } = await supabase
    .from('form field')
    .select('*')
    .eq('formId', formId)
    .order('orderIndex', { ascending: true });
  console.log("Fields error:", error);
  console.log("Fields count:", fields ? fields.length : 0);
  console.log("Fields:", JSON.stringify(fields, null, 2));
}

checkData().catch(console.error);
