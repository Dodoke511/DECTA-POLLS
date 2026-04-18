import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    const { email: rawEmail, password } = await request.json();
    const email = rawEmail.trim().toLowerCase();
    try {
        // First check if we have an existing session
        const { data: { session } } = await supabase.auth.getSession();

        // If there's an existing session, sign out first
        if (session) {
            await supabase.auth.signOut();
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        // Retrieve the tenant from the 'tenant users' table using the authenticated user id.
        // This is more robust than email matching on the 'tenants' table.
        const { data: tenantData } = await supabase
            .from('tenant users')
            .select('tenantID')
            .eq('id', data.user.id)
            .single();

        return NextResponse.json({
            message: 'Login successful',
            user: data.user,
            session: data.session,
            tenantId: tenantData?.tenantID
        }, { status: 200 });
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}