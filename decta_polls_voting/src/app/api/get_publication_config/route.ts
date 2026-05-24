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

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
    }

    // 1. Fetch available form fields from candidate_application
    const { data: form } = await supabase
      .from('forms')
      .select('id')
      .eq('electionID', electionId)
      .eq('phaseName', 'candidate_application')
      .maybeSingle();

    let fields: any[] = [];
    if (form) {
      const { data: formFields } = await supabase
        .from('form field')
        .select('*')
        .eq('formId', form.id)
        .order('orderIndex', { ascending: true });
      fields = formFields || [];
    }

    // 2. Fetch main config
    let { data: config } = await supabase
      .from('candidate_listing_config')
      .select('*')
      .eq('election_id', electionId)
      .maybeSingle();

    if (!config) {
        // Return default null responses to let frontend know it's not initialized
        return NextResponse.json({
            config: null,
            sections: [],
            documents: [],
            availableFields: fields,
        }, { status: 200 });
    }

    // 3. Fetch sections with their assigned fields
    const { data: sectionsData } = await supabase
      .from('listing_sections')
      .select(`
        *,
        listing_section_fields (*)
      `)
      .eq('election_id', electionId)
      .order('order_index', { ascending: true });

    // Order the nested fields
    const sections = (sectionsData || []).map((sec: any) => ({
      ...sec,
      listing_section_fields: (sec.listing_section_fields || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }));

    // 4. Fetch document configs
    const { data: documents } = await supabase
      .from('listing_documents')
      .select('*')
      .eq('election_id', electionId)
      .order('order_index', { ascending: true });

    return NextResponse.json({
      config,
      sections,
      documents: documents || [],
      availableFields: fields,
    }, { status: 200 });

  } catch (err: any) {
    console.error('get_publication_config error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
