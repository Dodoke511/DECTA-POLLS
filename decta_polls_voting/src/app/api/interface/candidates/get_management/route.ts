import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch candidates with their user info and election info
    const { data: candidates, error } = await supabase
      .from('candidate')
      .select(`
        id,
        status,
        filedDate,
        electionID,
        election:electionID ( title, slug ),
        user:userID ( id, first_name, surname, email )
      `)
      .eq('election:election.tenantID', tenantId) // Filter by tenant indirectly if needed, or join properly
      // Actually, candidate belongs to an election which belongs to a tenant.
      // But we can also filter by 'tenant users' since they belong to the tenant.
      
    // Re-fetching with explicit join logic to ensure accuracy for tenant filtering
    const { data: tenantCandidates, error: fetchError } = await supabase
      .from('candidate')
      .select(`
        id,
        status,
        filedDate,
        election:electionID!inner ( id, title, tenantID ),
        user:userID!inner ( id, first_name, surname, email )
      `)
      .eq('election.tenantID', tenantId)
      .order('filedDate', { ascending: false });

    if (fetchError) {
      console.error('Fetch Candidates Error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let candidatesWithPositions: any[] = tenantCandidates || [];

    if (candidatesWithPositions.length > 0) {
      const getElId = (c: any) => Array.isArray(c.election) ? c.election[0]?.id : c.election?.id;
      const getUserId = (c: any) => Array.isArray(c.user) ? c.user[0]?.id : c.user?.id;

      const electionIds = Array.from(new Set(candidatesWithPositions.map(c => getElId(c)).filter(Boolean)));
      
      // Get all forms for these elections
      if (electionIds.length > 0) {
        const { data: forms } = await supabase
          .from('forms')
          .select('id, electionID')
          .in('electionID', electionIds)
          .eq('phaseName', 'candidate_application');
          
        if (forms && forms.length > 0) {
          const formIds = forms.map(f => f.id);
          
          // Get position fields
          const { data: positionFields } = await supabase
            .from('form field')
            .select('id, formId')
            .in('formId', formIds)
            .eq('fieldType', 'position_selector');
            
          if (positionFields && positionFields.length > 0) {
             const fieldIds = positionFields.map(f => f.id);
             const userIds = Array.from(new Set(candidatesWithPositions.map(c => getUserId(c)).filter(Boolean)));
             
             const { data: responses } = await supabase
               .from('form response')
               .select('id, userID, formId')
               .in('formId', formIds)
               .in('userID', userIds);
               
             if (responses && responses.length > 0) {
               const responseIds = responses.map(r => r.id);
               
               // Finally, get the values
               const { data: values } = await supabase
                 .from('form response value')
                 .select('responseID, fieldID, value')
                 .in('responseID', responseIds)
                 .in('fieldID', fieldIds);
                 
               if (values && values.length > 0) {
                 candidatesWithPositions = candidatesWithPositions.map(c => {
                    const elId = getElId(c);
                    const uId = getUserId(c);
                    const form = forms.find(f => f.electionID === elId);
                    if (!form) return { ...c, position: null };
                    
                    const response = responses.find(r => r.formId === form.id && r.userID === uId);
                    if (!response) return { ...c, position: null };
                    
                    const value = values.find(v => v.responseID === response.id);
                    return { ...c, position: value ? value.value : null };
                 });
               }
             }
          }
        }
      }
    }

    let subscription = 'BASIC';
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('subscription')
      .eq('id', tenantId)
      .single();
    if (tenantData) subscription = tenantData.subscription || 'BASIC';

    return NextResponse.json({ 
      candidates: candidatesWithPositions,
      subscription
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
