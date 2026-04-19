import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE KEY (important for inserts)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Debug log
console.log("SUPABASE URL:", supabaseUrl);

// ==========================
// GET - Fetch voters
// ==========================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'Election ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('voters')
      .select('*')
      .eq('electionID', electionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// ==========================
// POST - Upload CSV
// ==========================
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get('csv') as File | null;
    const electionId = formData.get('electionId') as string;

    if (!csvFile || !electionId) {
      return NextResponse.json(
        { error: 'CSV file and Election ID are required' },
        { status: 400 }
      );
    }

    // Read CSV
    const text = await csvFile.text();
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Normalize headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Map headers
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const firstNameIndex = headers.findIndex(h => h.includes('first'));
    const middleNameIndex = headers.findIndex(h => h.includes('middle'));
    const surnameIndex = headers.findIndex(h => h.includes('surname') || h.includes('last'));
    const contactIndex = headers.findIndex(h => h.includes('contact') || h.includes('phone'));
    const birthDateIndex = headers.findIndex(h => h.includes('birth'));

    if (emailIndex === -1 || firstNameIndex === -1 || surnameIndex === -1) {
      return NextResponse.json(
        { error: 'CSV must contain Email, First Name, and Surname columns' },
        { status: 400 }
      );
    }

    const voters: any[] = [];
    const errors: string[] = [];

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      const email = values[emailIndex];
      const firstName = values[firstNameIndex];
      const middleName = middleNameIndex !== -1 ? values[middleNameIndex] : null;
      const surname = values[surnameIndex];
      const contact = contactIndex !== -1 ? values[contactIndex] : null;
      const birthDate = birthDateIndex !== -1 ? values[birthDateIndex] : null;

      if (!email || !firstName || !surname) {
        errors.push(`Line ${i + 1}: Missing required fields`);
        continue;
      }

      // Optional: Validate date format (YYYY-MM-DD)
      let formattedBirthDate = null;
      if (birthDate) {
        const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
        if (!isValidDate) {
          errors.push(`Line ${i + 1}: Invalid birth date format`);
          continue;
        }
        formattedBirthDate = birthDate;
      }

      voters.push({
        electionID: electionId,
        email,
        first_name: firstName,
        middle_name: middleName || null,
        surname,
        contact: contact || null,
        birth_date: formattedBirthDate,
      });
    }

    if (voters.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid voter data found',
          details: errors,
        },
        { status: 400 }
      );
    }

    // Insert into Supabase
    console.log("Attempting to insert voters:", voters.length);
    console.log("Sample voter data:", voters[0]);
    
    const { data, error } = await supabase
      .from('voters')
      .insert(voters)
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Successfully inserted voters:", data.length);

    return NextResponse.json(
      {
        message: 'Voters uploaded successfully',
        count: data.length,
        data,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
