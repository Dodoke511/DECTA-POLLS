import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type HeaderFieldMap = {
  full_name?: string[] | string;
  department?: string;
  course?: string;
  tagline?: string;
};

type ListingSectionField = {
  field_id: string;
  display_label?: string | null;
  is_visible?: boolean | null;
  order_index?: number | null;
};

type PublicField = {
  label: string;
  value: string;
};

const isImageUrl = (value: string) =>
  /^(https?:\/\/|\/)/i.test(value) && /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(value);

const normalizeNameParts = (map: HeaderFieldMap | null | undefined) => {
  const parts = map?.full_name;
  if (!parts) return [];
  return Array.isArray(parts) ? parts : [parts];
};

const isFileUrl = (value: string) => /^(https?:\/\/|\/)/i.test(value);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenant_slug: string; election_slug: string }> }
) {
  try {
    const { tenant_slug, election_slug } = await params;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenant_slug)
      .maybeSingle();

    if (tenantError) {
      throw tenantError;
    }

    const isVerified = tenant?.is_verified ?? tenant?.isVerified ?? true;

    if (!tenant || isVerified === false) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    const { data: election, error: electionError } = await supabase
      .from('election')
      .select('id, slug, title')
      .eq('slug', election_slug)
      .eq('tenantID', tenant.id)
      .maybeSingle();

    if (electionError) {
      throw electionError;
    }

    if (!election) {
      return NextResponse.json({ error: 'Election not found.' }, { status: 404 });
    }

    const electionId = election.id;

    const [{ data: config }, { data: form }] = await Promise.all([
      supabase
        .from('candidate_listing_config')
        .select('*')
        .eq('election_id', electionId)
        .maybeSingle(),
      supabase
        .from('forms')
        .select('id')
        .eq('electionID', electionId)
        .eq('phaseName', 'candidate_application')
        .maybeSingle(),
    ]);

    if (!form) {
      const [{ data: approvedCandidates }, { data: voteTallies }] = await Promise.all([
        supabase
          .from('candidate')
          .select('id, status, filedDate, userID')
          .eq('electionID', electionId)
          .eq('status', 'APPROVED')
          .order('filedDate', { ascending: true }),
        supabase
          .from('vote_tallies')
          .select('candidate_id, vote_count')
          .eq('election_id', electionId)
      ]);

      const candidates = approvedCandidates || [];
      const userIds = candidates.map(candidate => candidate.userID).filter(Boolean);
      const { data: users } = userIds.length
        ? await supabase
            .from('tenant users')
            .select('id, first_name, surname, email')
            .in('id', userIds)
        : { data: [] };
      const userById = new Map((users || []).map(user => [user.id, user]));
      const tallyByCandidateId = new Map((voteTallies || []).map(t => [t.candidate_id, t.vote_count]));

      return NextResponse.json({
        config: null,
        sections: [],
        documents: [],
        candidates: candidates.map(candidate => {
          const user = userById.get(candidate.userID);
          return {
            id: candidate.id,
            filedDate: candidate.filedDate,
            name: [user?.first_name, user?.surname].filter(Boolean).join(' ').trim() || 'Candidate',
            voteCount: tallyByCandidateId.get(candidate.id) || 0,
            position: null,
            photoUrl: null,
            header: { department: null, course: null, tagline: null },
            sections: [],
            documents: [],
          };
        }),
        isConfigured: false,
      });
    }

    const listingConfig = config || {
      layout_style: 'grid',
      show_photo: true,
      header_field_map: {},
      persist_after_phase: true,
      enable_profile_pages: false,
    };

    const [{ data: fields }, { data: sectionsData }, { data: documents }, { data: approvedCandidates }, { data: voteTallies }, { data: positions }] =
      await Promise.all([
        supabase
          .from('form field')
          .select('id, label, fieldType, orderIndex')
          .eq('formId', form.id)
          .order('orderIndex', { ascending: true }),
        supabase
          .from('listing_sections')
          .select('*, listing_section_fields (*)')
          .eq('election_id', electionId)
          .order('order_index', { ascending: true }),
        supabase
          .from('listing_documents')
          .select('*')
          .eq('election_id', electionId)
          .order('order_index', { ascending: true }),
        supabase
          .from('candidate')
          .select('id, status, filedDate, userID, political_party')
          .eq('electionID', electionId)
          .eq('status', 'APPROVED')
          .order('filedDate', { ascending: true }),
        supabase
          .from('vote_tallies')
          .select('candidate_id, vote_count')
          .eq('election_id', electionId),
        supabase
          .from('positions')
          .select('id, title, order_index')
          .eq('electionID', electionId)
      ]);

    const candidates = approvedCandidates || [];
    const userIds = candidates.map(candidate => candidate.userID).filter(Boolean);

    const [{ data: users }, { data: responses }] = await Promise.all([
      userIds.length
        ? supabase
            .from('tenant users')
            .select('id, first_name, surname, email')
            .in('id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase
            .from('form response')
            .select('id, userID')
            .eq('formId', form.id)
            .in('userID', userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const responseIds = (responses || []).map(response => response.id);
    const { data: responseValues } = responseIds.length
      ? await supabase
          .from('form response value')
          .select('responseID, fieldID, value')
          .in('responseID', responseIds)
      : { data: [] };

    const fieldById = new Map((fields || []).map(field => [field.id, field]));
    const userById = new Map((users || []).map(user => [user.id, user]));
    const responseByUserId = new Map((responses || []).map(response => [response.userID, response]));
    const valuesByResponseId = new Map<string, Map<string, string>>();
    const tallyByCandidateId = new Map((voteTallies || []).map(t => [t.candidate_id, t.vote_count]));

    (responseValues || []).forEach(value => {
      const values = valuesByResponseId.get(value.responseID) || new Map<string, string>();
      values.set(value.fieldID, value.value || '');
      valuesByResponseId.set(value.responseID, values);
    });

    const visibleSections = (sectionsData || [])
      .filter(section => section.is_visible !== false)
      .map(section => ({
        ...section,
        listing_section_fields: (section.listing_section_fields || [])
          .filter((field: ListingSectionField) => field.is_visible !== false)
          .sort((a: ListingSectionField, b: ListingSectionField) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }));

    const visibleDocuments = (documents || []).filter(document => document.is_visible !== false);
    const headerMap = (listingConfig.header_field_map || {}) as HeaderFieldMap;
    const namePartIds = normalizeNameParts(headerMap);
    const positionField = (fields || []).find(field => field.fieldType === 'position_selector');
    const fileFields = (fields || []).filter(field => field.fieldType === 'file_upload');
    const configuredDocumentFieldIds = new Set(visibleDocuments.map(document => document.field_id));
    const configuredSectionFieldIds = new Set(
      visibleSections.flatMap(section =>
        (section.listing_section_fields || []).map((sectionField: ListingSectionField) => sectionField.field_id)
      )
    );
    const headerFieldIds = new Set([
      ...namePartIds,
      headerMap.department,
      headerMap.course,
      headerMap.tagline,
      positionField?.id,
    ].filter(Boolean));

    const positionTitleToIndex = new Map((positions || []).map(p => [(p.title || '').toLowerCase().trim(), p.order_index ?? 9999]));

    const publicCandidates = candidates.map(candidate => {
      const user = userById.get(candidate.userID);
      const response = responseByUserId.get(candidate.userID);
      const values = response ? valuesByResponseId.get(response.id) || new Map<string, string>() : new Map<string, string>();
      const fallbackName = [user?.first_name, user?.surname].filter(Boolean).join(' ').trim() || 'Candidate';
      const configuredName = namePartIds.map(fieldId => values.get(fieldId)).filter(Boolean).join(' ').trim();
      const photoUrl = listingConfig.show_photo
        ? fileFields.map(field => values.get(field.id) || '').find(value => value && isImageUrl(value)) || null
        : null;

      const positionName = positionField ? values.get(positionField.id) || null : null;
      const positionOrderIndex = positionName ? positionTitleToIndex.get(positionName.toLowerCase().trim()) ?? 9999 : 9999;

      return {
        id: candidate.id,
        filedDate: candidate.filedDate,
        name: configuredName || fallbackName,
        voteCount: tallyByCandidateId.get(candidate.id) || 0,
        position: positionName,
        _positionOrderIndex: positionOrderIndex,
        political_party: candidate.political_party || 'INDEPENDENT',
        photoUrl,
        header: {
          department: headerMap.department ? values.get(headerMap.department) || null : null,
          course: headerMap.course ? values.get(headerMap.course) || null : null,
          tagline: headerMap.tagline ? values.get(headerMap.tagline) || null : null,
        },
        sections: [
          ...visibleSections.map(section => ({
          id: section.id,
          label: section.label,
          displayStyle: section.display_style || 'rows',
          fields: section.listing_section_fields
            .map((sectionField: ListingSectionField) => ({
              label: sectionField.display_label || fieldById.get(sectionField.field_id)?.label || 'Field',
              value: values.get(sectionField.field_id) || '',
            }))
            .filter((field: PublicField) => field.value),
          })),
          {
            id: 'all-candidate-details',
            label: 'Additional Details',
            displayStyle: 'rows',
            fields: (fields || [])
              .filter(field => field.fieldType !== 'file_upload')
              .filter(field => !configuredSectionFieldIds.has(field.id))
              .filter(field => !headerFieldIds.has(field.id))
              .map(field => ({
                label: field.label || 'Field',
                value: values.get(field.id) || '',
              }))
              .filter(field => field.value),
          },
        ].filter(section => section.fields.length > 0),
        documents: [
          ...visibleDocuments.map(document => ({
            label: document.display_label || fieldById.get(document.field_id)?.label || 'Document',
            url: values.get(document.field_id) || '',
          })),
          ...fileFields
            .filter(field => !configuredDocumentFieldIds.has(field.id))
            .map(field => ({
              label: field.label || 'Document',
              url: values.get(field.id) || '',
            })),
        ].filter(document => document.url && isFileUrl(document.url) && !isImageUrl(document.url)),
      };
    });

    publicCandidates.sort((a, b) => {
      if (a._positionOrderIndex !== b._positionOrderIndex) {
        return a._positionOrderIndex - b._positionOrderIndex;
      }
      return a.name.localeCompare(b.name);
    });

    const finalCandidates = publicCandidates.map(({ _positionOrderIndex, ...rest }) => rest);

    return NextResponse.json({
      config: {
        layout_style: listingConfig.layout_style,
        show_photo: listingConfig.show_photo,
        persist_after_phase: listingConfig.persist_after_phase,
        enable_profile_pages: listingConfig.enable_profile_pages,
      },
      sections: visibleSections,
      documents: visibleDocuments,
      candidates: finalCandidates,
      isConfigured: Boolean(config),
    });
  } catch (err: unknown) {
    console.error('public candidates error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
