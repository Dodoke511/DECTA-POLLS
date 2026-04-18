import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { electionId, config, sections, documents } = body;

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId.' }, { status: 400 });
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

    const tenantId = election.tenantID;

    // 1. Upsert config
    if (config) {
      const configRecord = {
        election_id: electionId,
        tenant_id: tenantId,
        layout_style: config.layout_style,
        show_photo: config.show_photo,
        header_field_map: config.header_field_map || {},
        persist_after_phase: config.persist_after_phase,
        enable_profile_pages: config.enable_profile_pages,
        updated_at: new Date().toISOString(),
      };

      const { error: configError } = await supabase
        .from('candidate_listing_config')
        .upsert(configRecord, { onConflict: 'election_id' });

      if (configError) throw configError;
    }

    // 2. Sync Sections & Fields
    if (sections && Array.isArray(sections)) {
      // Clear existing sections (cascade will drop the section_fields)
      const { error: sectionDeleteError } = await supabase
        .from('listing_sections')
        .delete()
        .eq('election_id', electionId);

      if (sectionDeleteError) throw sectionDeleteError;

      // Insert sections one by one to get their new IDs and insert child fields
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        
        const { data: insertedSec, error: insertSecError } = await supabase
          .from('listing_sections')
          .insert({
            election_id: electionId,
            tenant_id: tenantId,
            label: sec.label,
            order_index: i, // Use array index to enforce tight ordering
            is_visible: sec.is_visible,
            display_style: sec.display_style || 'rows',
          })
          .select('id')
          .single();

        if (insertSecError) throw insertSecError;

        // Insert fields for this section
        if (sec.listing_section_fields && Array.isArray(sec.listing_section_fields)) {
            const fieldRecords = sec.listing_section_fields.map((f: any, fIndex: number) => ({
                section_id: insertedSec.id,
                election_id: electionId,
                tenant_id: tenantId,
                field_id: f.field_id,
                display_label: f.display_label,
                order_index: fIndex, // array index ordering
                is_visible: f.is_visible ?? true,
            }));

            if (fieldRecords.length > 0) {
                const { error: insertFieldsError } = await supabase
                    .from('listing_section_fields')
                    .insert(fieldRecords);
                
                if (insertFieldsError) throw insertFieldsError;
            }
        }
      }
    }

    // 3. Sync Documents
    if (documents && Array.isArray(documents)) {
        const { error: docsDeleteError } = await supabase
            .from('listing_documents')
            .delete()
            .eq('election_id', electionId);

        if (docsDeleteError) throw docsDeleteError;

        const docRecords = documents.map((doc: any, i: number) => ({
            election_id: electionId,
            tenant_id: tenantId,
            field_id: doc.field_id,
            display_label: doc.display_label,
            is_visible: doc.is_visible,
            order_index: i,
        }));

        if (docRecords.length > 0) {
            const { error: docsInsertError } = await supabase
                .from('listing_documents')
                .insert(docRecords);
            
            if (docsInsertError) throw docsInsertError;
        }
    }

    return NextResponse.json({ message: 'Publication config saved successfully.' }, { status: 200 });

  } catch (err: any) {
    console.error('save_publication_config error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
