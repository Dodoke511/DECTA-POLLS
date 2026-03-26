import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// Using SUPABASE_SERVICE_ROLE_KEY for admin privileges (bypassing RLS) within a server context,
// or falling back to the public anon key if the service role key is missing.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            orgName,
            email,
            type,
            subscription,
            verificationDoc,
            isVerified,
            first_name,
            middle_name,
            surname,
            contact,
            birth_date,
            status,
            slug,
            main_color,
            second_color,
            logo_url
        } = body;

        const organization = orgName;

        // Basic validation for required fields
        if (!organization || !email || !type || !subscription || !first_name || !surname) {
            return NextResponse.json(
                { error: 'Missing required fields: organization (or orgName), email, type, subscription, first_name, surname' },
                { status: 400 }
            );
        }

        // Validate subscription enum
        if (!['BASIC', 'STANDARD', 'ENTERPRISE'].includes(subscription)) {
            return NextResponse.json(
                { error: 'Invalid subscription value. Must be BASIC, STANDARD, or ENTERPRISE' },
                { status: 400 }
            );
        }

        // Validate status enum
        const userStatus = status || 'new'; // Default to 'new' if not provided
        if (!['new', 'active', 'inactive'].includes(userStatus)) {
            return NextResponse.json(
                { error: 'Invalid status value. Must be new, active, or inactive' },
                { status: 400 }
            );
        }

        // Insert data into the 'tenants' table
        const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .insert([
                {
                    organization,
                    email,
                    type,
                    subscription,
                    verificationDoc: verificationDoc || null,
                    isVerified: Boolean(isVerified) // Cast to boolean to ensure correct type
                }
            ])
            .select();

        if (tenantError) {
            console.error('Supabase Tenant Insert Error:', tenantError);
            return NextResponse.json({ error: tenantError.message }, { status: 500 });
        }

        // Extract tenant ID to link the new user and branding to the tenant
        const tenantId = tenantData && tenantData.length > 0 ? tenantData[0].id : null;

        // Insert data into the 'branding' table
        const { data: brandingData, error: brandingError } = await supabase
            .from('branding')
            .insert([
                {
                    tenant_id: tenantId,
                    slug,
                    main_color: main_color || null,
                    second_color: second_color || null,
                    logo_url: logo_url || null
                }
            ])
            .select();

        if (brandingError) {
            console.error('Supabase Branding Insert Error:', brandingError);
            return NextResponse.json({ error: brandingError.message }, { status: 500 });
        }

        // Insert data into the 'tenant_users' table
        const { data: userData, error: userError } = await supabase
            .from('tenant_users')
            .insert([
                {
                    tenant_id: tenantId,
                    email,
                    first_name,
                    middle_name: middle_name || null,
                    surname,
                    contact: contact || null,
                    birth_date: birth_date || null,
                    status: userStatus
                }
            ])
            .select();

        if (userError) {
            console.error('Supabase Tenant User Insert Error:', userError);
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Tenant, branding, and user created successfully',
            tenant: tenantData[0],
            branding: brandingData ? brandingData[0] : null,
            user: userData[0]
        }, { status: 201 });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
