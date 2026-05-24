import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { electionId, toolName, fields, customLogicMeta } = await request.json();

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

    // Update form metadata if provided
    if (customLogicMeta) {
      await supabase
        .from('forms')
        .update({ custom_logic_meta: customLogicMeta })
        .eq('id', formId);
    }

    // Sync form fields: Remove deleted ones, upsert remaining
    const incomingIds = fields
      .filter((f: any) => f.id)
      .map((f: any) => f.id);

    // Only attempt deletion if we need to remove fields that are no longer in the list.
    // We build the query with the correct PostgREST tuple format for .not('id','in',...).
    if (incomingIds.length > 0) {
      // Delete fields belonging to this form whose id is NOT in the incoming list
      const { error: deleteError } = await supabase
        .from('form field')
        .delete()
        .eq('formId', formId)
        .not('id', 'in', `(${incomingIds.join(',')})`);

      if (deleteError) {
        console.error('Delete error (likely FK violation — field has existing responses):', deleteError.message);
      }
    } else if (fields.length === 0) {
      // No incoming fields at all — delete everything for this form
      const { error: deleteError } = await supabase
        .from('form field')
        .delete()
        .eq('formId', formId);

      if (deleteError) {
        console.error('Delete-all error:', deleteError.message);
      }
    }
    // If incomingIds is empty but fields.length > 0, all fields are new (no ids yet) —
    // nothing to delete.

    if (Array.isArray(fields) && fields.length > 0) {
      const fieldRecords = fields.map((f: any, i: number) => ({
        id: f.id || randomUUID(),
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

      console.log('[save_form] Upserting', fieldRecords.length, 'fields for formId:', formId);

      const { error: upsertFieldsError } = await supabase
        .from('form field')
        .upsert(fieldRecords);

      if (upsertFieldsError) {
        console.error('[save_form] Upsert error:', upsertFieldsError);
        console.error('[save_form] Field records that failed:', JSON.stringify(fieldRecords, null, 2));
        return NextResponse.json({ error: upsertFieldsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Form saved successfully.', formId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
