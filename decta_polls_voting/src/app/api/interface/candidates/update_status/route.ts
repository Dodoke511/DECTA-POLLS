import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { candidateId, status, removeFromOrg, retainAsVoter, userId } = await request.json();

    if (!candidateId || !status) {
      return NextResponse.json({ error: 'Missing candidateId or status' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update candidate status
    const { error: candError } = await supabase
      .from('candidate')
      .update({ status })
      .eq('id', candidateId);

    if (candError) {
      console.error('Update Candidate Error:', candError);
      return NextResponse.json({ error: candError.message }, { status: 500 });
    }

    // 2. Handle Rejection Actions
    if (status === 'REJECTED' && userId) {
      if (removeFromOrg) {
        // Delete from tenant users
        await supabase.from('tenant users').delete().eq('id', userId);
        // We don't delete from auth to avoid breaking other tenant memberships if they exist,
        // but since this is a single-tenant per-user system usually, it's safer to just remove from tenant table.
      } else if (retainAsVoter) {
        // Change user_type to Voter
        await supabase.from('tenant users').update({ user_type: 'Voter' }).eq('id', userId);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
