import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { triggerNotification } from '@/lib/server/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ election_id: string }> }
) {
  try {
    const { election_id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // 1. Authenticate & Authorize Admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user is tenant admin for this election's tenant
    const { data: election } = await supabaseAdmin
      .from('election')
      .select('tenantID')
      .eq('id', election_id)
      .single();

    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    const { data: tenantUser } = await supabaseAdmin
      .from('tenant users')
      .select('user_type')
      .eq('id', user.id)
      .eq('tenantID', election.tenantID)
      .single();

    if (!tenantUser || !['admin', 'sub-admin'].includes(tenantUser.user_type?.toLowerCase())) {
      return NextResponse.json({ error: 'Admin access required to publish results' }, { status: 403 });
    }

    // 2. Call Compute RPC
    const { error: rpcError } = await supabaseAdmin.rpc('compute_election_results', {
      p_election_id: election_id,
      p_tenant_id: election.tenantID
    });

    if (rpcError) {
      console.error('Compute results RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to compute results' }, { status: 500 });
    }

    // 3. Mark Config as Published
    const { error: updateError } = await supabaseAdmin
      .from('results_config')
      .update({ published_at: new Date().toISOString() })
      .eq('election_id', election_id);

    if (updateError) {
       console.error('Update results config error:', updateError);
    } else {
      // Trigger notification asynchronously
      triggerNotification('Results Published', election.tenantID, election_id)
        .catch(err => console.error('[Publish Results API] Notification trigger error:', err));
    }

    return NextResponse.json({ success: true, message: 'Results computed and published successfully' });

  } catch (error) {
    console.error('Publish results error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
