import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;

    if (!file || !email) {
      return NextResponse.json(
        { error: "File and email are required" },
        { status: 400 }
      );
    }

    // Convert file to buffer for Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create a unique file path (e.g. tenant_email/timestamp_filename)
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `${email.replace(/[@.]/g, '_')}/${fileName}`;

    // Upload to Supabase Storage Bucket 'tenant_logos'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("tenant_logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload_tenant_logo] Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get the public URL for the newly uploaded file
    const { data: publicUrlData } = supabase.storage
      .from("tenant_logos")
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: "Logo uploaded successfully",
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err: any) {
    console.error("[upload_tenant_logo] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
