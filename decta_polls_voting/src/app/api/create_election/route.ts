import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const tenantId = formData.get('tenantId') as string;
    const title = formData.get('title') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const bannerFile = formData.get('banner') as File | null;

    if (!tenantId || !title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, title, startDate, endDate.' },
        { status: 400 }
      );
    }

    // Upload banner to Supabase Storage if provided
    let bannerUrl: string | null = null;
    if (bannerFile && bannerFile.size > 0) {
      const fileExt = bannerFile.name.split('.').pop();
      const fileName = `elections/${tenantId}/${Date.now()}.${fileExt}`;
      const arrayBuffer = await bannerFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('election-banners')
        .upload(fileName, buffer, {
          contentType: bannerFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Banner upload error:', uploadError);
        // Non-fatal: continue without banner
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('election-banners')
          .getPublicUrl(fileName);
        bannerUrl = publicUrlData?.publicUrl ?? null;
      }
    }

    // Insert election draft into database
    const { data, error } = await supabase
      .from('election')
      .insert([
        {
          tenant_id: tenantId,
          title,
          start_date: startDate,
          end_date: endDate,
          status: 'draft',
          banner: bannerUrl,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create election record.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Election draft created successfully.', electionId: data.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('create_election API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
