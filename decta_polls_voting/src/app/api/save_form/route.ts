import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId, toolName, fields } = await request.json();

    if (!electionId || !toolName) {
      return NextResponse.json({ error: 'Missing electionId or toolName.' }, { status: 400 });
    }

    // Resolve tenantID from election
    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('tenantID')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    // Check if form already exists
    const { data: existingForm } = await supabase
      .from('forms')
      .select('id')
      .eq('electionID', electionId)
      .eq('phaseName', toolName)
      .maybeSingle();

    let formId: string;

    if (existingForm) {
      formId = existingForm.id;
    } else {
      const { data: newForm, error: insertError } = await supabase
        .from('forms')
        .insert({
          tenantID: election.tenantID,
          electionID: electionId,
          phaseName: toolName,
        })
        .select('id')
        .single();

      if (insertError || !newForm) {
        return NextResponse.json(
          { error: insertError?.message || 'Failed to create form.' },
          { status: 500 }
        );
      }
      formId = newForm.id;
    }

    // Replace all form fields: delete existing, insert new
    const { error: deleteError } = await supabase
      .from('form field')
      .delete()
      .eq('formId', formId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (Array.isArray(fields) && fields.length > 0) {
      const fieldRecords = fields.map((f: any, i: number) => ({
        formId: formId,
        fieldName: f.fieldName,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required ?? false,
        rule_checkable: f.ruleCheckable ?? false,
        placeholder: f.placeholder || null,
        validationRules: f.validationRules ?? {},
        orderIndex: i,
      }));

      const { error: insertFieldsError } = await supabase
        .from('form field')
        .insert(fieldRecords);

      if (insertFieldsError) {
        return NextResponse.json({ error: insertFieldsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Form saved successfully.', formId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
