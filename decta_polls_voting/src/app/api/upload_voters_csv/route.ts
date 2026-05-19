import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkUserLimit } from "@/lib/server/user-limit-check";

const TEMPORARY_VOTER_PASSWORD = "12345";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ParsedVoter {
  tenantID: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  contact: string | null;
  birth_date: string | null;
  user_type: string;
  department: string | null;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Internal Server Error";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // Read CSV file
    const text = await file.text();
    
    // Split by different line break types (Windows \r\n, Unix \n, Mac \r)
    const lines = text.split(/\r?\n|\r/).filter((line) => line.trim());

    console.log('CSV lines found:', lines.length);
    console.log('First line (header):', lines[0]);
    console.log('Second line (first data):', lines[1]);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file is empty or invalid. Make sure each row is on a new line." },
        { status: 400 }
      );
    }

    // Parse CSV header - handle both comma and semicolon separators
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase());

    console.log('Headers found:', headers);
    console.log('Separator used:', separator);

    // Validate required columns
    const requiredColumns = ["email", "first_name", "surname"];
    const missingColumns = requiredColumns.filter(
      (col) => !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingColumns.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Parse CSV rows
    const voters: ParsedVoter[] = [];
    const errors: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim());
      const row: Record<string, string | null> = {};

      console.log(`Row ${i}:`, values);

      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      // Validate required fields
      if (!row.email || !row.first_name || !row.surname) {
        errors.push({
          line: i + 1,
          error: "Missing required fields (email, first_name, surname)",
          data: row
        });
        continue;
      }

      voters.push({
        tenantID: tenantId,
        email: row.email.toLowerCase(),
        first_name: row.first_name,
        middle_name: row.middle_name || null,
        surname: row.surname,
        contact: row.contact || null,
        birth_date: row.birth_date || null,
        user_type: "voter",
        department: row.department || null,
      });
    }

    console.log('Valid voters found:', voters.length);
    console.log('Errors found:', errors.length);

    if (voters.length === 0) {
      return NextResponse.json(
        {
          error: "No valid voters found in CSV",
          details: errors,
        },
        { status: 400 }
      );
    }

    // --- CHECK USER LIMITS ---
    const limitCheck = await checkUserLimit(tenantId);
    if (!limitCheck.allowed || (limitCheck.limit !== null && limitCheck.currentCount + voters.length > limitCheck.limit)) {
      const remainingSlots = limitCheck.limit !== null ? Math.max(0, limitCheck.limit - limitCheck.currentCount) : 'unlimited';
      return NextResponse.json(
        {
          error: `Upload rejected. This upload contains ${voters.length} users, but you only have ${remainingSlots} slots remaining before reaching your limit of ${limitCheck.limit}.`,
        },
        { status: 403 }
      );
    }

    const insertedVoters: unknown[] = [];

    for (const voter of voters) {
      const { data: existingTenantUser } = await supabase
        .from("tenant users")
        .select("id")
        .eq("tenantID", tenantId)
        .eq("email", voter.email)
        .maybeSingle();

      if (existingTenantUser) {
        errors.push({
          email: voter.email,
          error: "Email already exists for this tenant",
        });
        continue;
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: voter.email,
        password: TEMPORARY_VOTER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role_type: "Voter",
          temporary_password: true,
        },
      });

      if (authError || !authUser.user) {
        errors.push({
          email: voter.email,
          error: authError?.message || "Failed to create auth user",
        });
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("tenant users")
        .insert({
          ...voter,
          id: authUser.user.id,
          user_type: "Voter",
        })
        .select()
        .single();

      if (insertError) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        errors.push({
          email: voter.email,
          error: insertError.message,
        });
        continue;
      }

      insertedVoters.push(inserted);
    }

    if (insertedVoters.length === 0) {
      return NextResponse.json(
        {
          error: "No voters were uploaded",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Voters uploaded successfully",
      count: insertedVoters.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error("[upload_voters_csv] API error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
