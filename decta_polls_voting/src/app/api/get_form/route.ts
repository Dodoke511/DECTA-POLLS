import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const toolName = searchParams.get('toolName') || 'candidate_application';

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // Fetch form record by election + tool name
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('electionID', electionId)
      .eq('phaseName', toolName)
      .maybeSingle();

    if (formError) {
      return NextResponse.json({ error: formError.message }, { status: 500 });
    }

    if (!form) {
      return NextResponse.json({ form: null, fields: [] }, { status: 200 });
    }

    // Fetch fields ordered by orderIndex
    const { data: fields, error: fieldsError } = await supabase
      .from('form field')
      .select('*')
      .eq('formId', form.id)
      .order('orderIndex', { ascending: true });

    if (fieldsError) {
      return NextResponse.json({ error: fieldsError.message }, { status: 500 });
    }

    return NextResponse.json({ form, fields: fields ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
