import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkUserLimit } from "@/lib/server/user-limit-check";



function parseDateString(dateStr: string | null) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3 && parts[2].length === 4) {
    // If first part is > 12, it MUST be day (DD/MM/YYYY)
    if (parseInt(parts[0]) > 12) {
       return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } 
    // If second part is > 12, it MUST be day (MM/DD/YYYY)
    else if (parseInt(parts[1]) > 12) {
       return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    } 
    // Ambiguous (e.g., 05/06/2000) - default to DD/MM/YYYY to match user's explicit DD/MM/YYYY usage
    else {
       return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
}

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
  registered_via_election?: string | null;
  registered_via_slug?: string | null;
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Internal Server Error";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;
    const electionId = formData.get("electionId") as string | null;
    const electionSlug = formData.get("electionSlug") as string | null;

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
    const seenEmailsInCsv = new Set<string>();

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

      const emailLower = row.email.toLowerCase();
      if (seenEmailsInCsv.has(emailLower)) {
        // Skip duplicate email within the same CSV file silently ("just let it be")
        continue;
      }
      seenEmailsInCsv.add(emailLower);

      voters.push({
        tenantID: tenantId,
        email: emailLower,
        first_name: row.first_name,
        middle_name: row.middle_name || null,
        surname: row.surname,
        contact: row.contact || null,
        birth_date: parseDateString(row.birth_date || null),
        user_type: "voter",
        department: row.department || null,
        registered_via_election: electionId || null,
        registered_via_slug: electionSlug || null,
      });
    }

    console.log('Valid unique voters found in CSV:', voters.length);
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

    // --- BULK DATABASE DUPLICATION CHECK ---
    const csvEmails = voters.map((v) => v.email);
    const existingEmails = new Set<string>();

    if (csvEmails.length > 0) {
      const { data: existingUsers, error: fetchError } = await supabase
        .from("tenant users")
        .select("email")
        .eq("tenantID", tenantId)
        .in("email", csvEmails);

      if (fetchError) {
        console.error("[upload_voters_csv] Error fetching existing users:", fetchError);
      } else if (existingUsers) {
        existingUsers.forEach((u) => {
          if (u.email) {
            existingEmails.add(u.email.toLowerCase());
          }
        });
      }
    }

    // Only insert voters that do not exist in the tenant's database
    const votersToInsert = voters.filter((voter) => !existingEmails.has(voter.email));

    // If all voters are already registered, return success 200 OK cleanly ("just let it be")
    if (votersToInsert.length === 0) {
      return NextResponse.json({
        message: "All uploaded voters are already registered.",
        count: 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // --- CHECK USER LIMITS ---
    // Only check limits based on the actual new voters to be inserted
    const limitCheck = await checkUserLimit(tenantId);
    if (!limitCheck.allowed || (limitCheck.limit !== null && limitCheck.currentCount + votersToInsert.length > limitCheck.limit)) {
      const remainingSlots = limitCheck.limit !== null ? Math.max(0, limitCheck.limit - limitCheck.currentCount) : 'unlimited';
      return NextResponse.json(
        {
          error: `Upload rejected. This upload would add ${votersToInsert.length} new users, but you only have ${remainingSlots} slots remaining before reaching your limit of ${limitCheck.limit}.`,
        },
        { status: 403 }
      );
    }

    const insertedVoters: unknown[] = [];

    for (const voter of votersToInsert) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: voter.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role_type: "Voter",
          temporary_password: true,
        },
      });

      let authUserId: string | null = authUser?.user?.id ?? null;

      // If createUser failed, check if it's because the email already exists
      // in Supabase Auth globally (e.g., from a previous failed upload or another tenant).
      // In that case, find the existing auth user's UUID and reuse it.
      if (authError || !authUserId) {
        const isAlreadyRegistered =
          authError?.message?.toLowerCase().includes("already") ||
          authError?.message?.toLowerCase().includes("registered") ||
          authError?.status === 422;

        if (isAlreadyRegistered) {
          // Paginate through auth users to find the matching email
          let foundId: string | null = null;
          let page = 1;
          const perPage = 1000;

          while (!foundId) {
            const { data: listData, error: listError } =
              await supabase.auth.admin.listUsers({ page, perPage });

            if (listError || !listData?.users?.length) break;

            const match = listData.users.find(
              (u) => u.email?.toLowerCase() === voter.email
            );

            if (match) {
              foundId = match.id;
              break;
            }

            // No more pages
            if (listData.users.length < perPage) break;
            page++;
          }

          if (foundId) {
            authUserId = foundId;
          } else {
            errors.push({
              email: voter.email,
              error: authError?.message || "Failed to create or locate auth user",
            });
            continue;
          }
        } else {
          errors.push({
            email: voter.email,
            error: authError?.message || "Failed to create auth user",
          });
          continue;
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from("tenant users")
        .insert({
          ...voter,
          id: authUserId,
          user_type: "Voter",
        })
        .select()
        .single();

      if (insertError) {
        // Only delete the auth user if WE just created it (not a pre-existing one)
        if (authUser?.user?.id && authUser.user.id === authUserId) {
          await supabase.auth.admin.deleteUser(authUserId);
        }
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
