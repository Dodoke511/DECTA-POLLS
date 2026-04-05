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
        const formData = await request.formData();

        const organization = formData.get('organization') as string;
        const email = formData.get('email') as string;
        const type = formData.get('type') as string;
        const subscription = formData.get('subscription') as string;
        const verification = formData.get('verification') as File | null;
        const isVerified = formData.get('isVerified') === 'true';
        const tenantStatus = formData.get('status') as string;
        const first_name = formData.get('first_name') as string;
        const middle_name = formData.get('middle_name') as string | null;
        const surname = formData.get('surname') as string;
        const contact = formData.get('contact') as string | null;
        const birth_date = formData.get('birth_date') as string | null;
        const status = formData.get('status') as string | null;
        const slug = formData.get('slug') as string;
        const main_color = formData.get('main_color') as string;
        const second_color = formData.get('second_color') as string;
        const logo_url_file = formData.get('logo_url') as File | null;
        const auth_id = formData.get('auth_id') as string;

        let verificationDocUrl = null;
        if (verification && verification instanceof File && verification.size > 0) {
            console.log(`[verification] name=${verification.name}, type=${verification.type}, size=${verification.size}`);
            const bytes = await verification.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const { data, error } = await supabase.storage
                .from('tenant_verifications')
                .upload(`${organization}-${Date.now()}-${verification.name}`, buffer, {
                    contentType: verification.type || 'application/octet-stream',
                });

            if (error) {
                console.error("Verification upload error:", JSON.stringify(error));
                return NextResponse.json({ error: `Verification upload failed: ${error.message}` }, { status: 500 });
            } else if (data) {
                const { data: publicUrlData } = supabase.storage.from('tenant_verifications').getPublicUrl(data.path);
                verificationDocUrl = publicUrlData.publicUrl;
                console.log(`[verification] uploaded to: ${verificationDocUrl}`);
            }
        } else {
            console.warn(`[verification] skipped — field missing, not a File, or empty. Received:`, verification);
        }

        let logoDocUrl = null;
        if (logo_url_file && logo_url_file instanceof File && logo_url_file.size > 0) {
            console.log(`[logo] name=${logo_url_file.name}, type=${logo_url_file.type}, size=${logo_url_file.size}`);
            const bytes = await logo_url_file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const { data, error } = await supabase.storage
                .from('tenant_logos')
                .upload(`${organization}-${Date.now()}-${logo_url_file.name}`, buffer, {
                    contentType: logo_url_file.type || 'application/octet-stream',
                });

            if (error) {
                console.error("Logo upload error:", JSON.stringify(error));
            } else if (data) {
                const { data: publicUrlData } = supabase.storage.from('tenant_logos').getPublicUrl(data.path);
                logoDocUrl = publicUrlData.publicUrl;
                console.log(`[logo] uploaded to: ${logoDocUrl}`);
            }
        }

        // Basic validation for required fields
        if (!organization || !email || !type || !subscription || !first_name || !surname) {
            return NextResponse.json(
                { error: 'Missing required fields: organization, email, type, subscription, first_name, surname' },
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
                    verification: verificationDocUrl,
                    status: tenantStatus,
                    is_verified: isVerified,
                    slug,
                    main_color: main_color,
                    secondary_color: second_color,
                    logo_url: logoDocUrl
                }
            ])
            .select();

        if (tenantError) {
            console.error('Supabase Tenant Insert Error:', tenantError);
            return NextResponse.json({ error: tenantError.message }, { status: 500 });
        }

        // Extract tenant ID to link the new user and branding to the tenant
        const tenantId = tenantData && tenantData.length > 0 ? tenantData[0].id : null;

        // Insert data into the 'tenant_users' table
        const { data: userData, error: userError } = await supabase
            .from('tenant users')
            .insert([
                {
                    id: auth_id,
                    tenantID: tenantId,
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
