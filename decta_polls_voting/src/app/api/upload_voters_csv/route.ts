import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const voters = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map((v) => v.trim());
      const row: any = {};

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

      // Prepare voter data with generated UUID
      voters.push({
        id: randomUUID(), // Generate UUID for the id column
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

    // Insert voters into database - Supabase will auto-generate UUIDs for id column
    const { data, error } = await supabase
      .from("tenant users")
      .insert(voters)
      .select();

    if (error) {
      console.error("[upload_voters_csv] Supabase error:", error);
      return NextResponse.json(
        {
          error: error.message,
          hint: "Some emails might already exist in the database",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Voters uploaded successfully",
      count: data?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[upload_voters_csv] API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
