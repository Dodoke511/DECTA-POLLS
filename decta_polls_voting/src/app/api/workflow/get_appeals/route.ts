import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Missing electionId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch appeals join with candidate and tenant users
    // Note: We're using service role to bypass RLS for management APIs
    const { data: appeals, error } = await supabase
      .from('appeals')
      .select(`
        id,
        status,
        submittedAt,
        candidateID,
        candidate:candidateID (
          id,
          user:userID (
            id,
            first_name,
            surname,
            email
          )
        )
      `)
      .eq('electionID', electionId)
      .order('submittedAt', { ascending: false });

    if (error) {
      console.error('Fetch Appeals Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to the format expected by the frontend
    const mappedAppeals = (appeals || []).map((a: any) => ({
      id: a.id,
      candidateId: a.candidateID,
      candidateName: `${a.candidate?.user?.first_name} ${a.candidate?.user?.surname}`,
      candidateEmail: a.candidate?.user?.email,
      status: a.status,
      createdAt: a.submittedAt,
      reason: "Please check form response values for detailed reason." // Placeholder until we integrate form engine
    }));

    return NextResponse.json({ appeals: mappedAppeals });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
