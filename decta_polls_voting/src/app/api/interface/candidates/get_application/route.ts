import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const electionId = searchParams.get('electionId');

    if (!userId || !electionId) {
      return NextResponse.json({ error: 'Missing userId or electionId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Form
    const { data: formsData, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('electionID', electionId)
      .eq('phaseName', 'candidate_application')
      .maybeSingle();

    if (formError || !formsData) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // 2. Fetch Form Fields
    const { data: fieldsData } = await supabase
      .from('form field')
      .select('*')
      .eq('formId', formsData.id)
      .order('orderIndex', { ascending: true });

    // 3. Fetch Candidate Form Response
    const { data: responseData } = await supabase
      .from('form response')
      .select('*')
      .eq('formId', formsData.id)
      .eq('userID', userId)
      .maybeSingle();

    let responseValues = [];
    if (responseData) {
      // 4. Fetch Response Values
      const { data: valuesData } = await supabase
        .from('form response value')
        .select('*')
        .eq('responseID', responseData.id);
      
      responseValues = valuesData || [];
    }

    // 5. Fetch Phase Rules for Screening
    const { data: rulesData } = await supabase
      .from('phase rule')
      .select('*')
      .eq('electionID', electionId)
      .eq('phaseType', 'screening');

    return NextResponse.json({
      formConfig: formsData,
      formFields: fieldsData || [],
      responseValues: responseValues,
      phaseRules: rulesData || []
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
