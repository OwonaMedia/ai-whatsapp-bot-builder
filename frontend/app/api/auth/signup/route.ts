import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Validierungsschema
const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Anfrage parsen
    const body = await request.json();

    // Validierung
    const { email, password, full_name } = SignupSchema.parse(body);

    // Supabase Public Client (publishable/anon key)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonOrPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_adnvXge3RS1DNBHvXuP26A_BFcZQ4Rj';

    if (!supabaseUrl || !supabaseAnonOrPublishableKey) {
      console.error('[Signup] Missing Supabase env variables', {
        url: !!supabaseUrl,
        anonKeyPresent: !!supabaseAnonOrPublishableKey,
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    console.log('[Signup] Using Supabase URL', supabaseUrl);
    console.log('[Signup] Using key prefix', supabaseAnonOrPublishableKey.slice(0, 20));

    const supabase = createClient(supabaseUrl, supabaseAnonOrPublishableKey, {
      auth: { persistSession: false },
    });

    // Benutzer registrieren (public signUp triggers email verification)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          signup_date: new Date().toISOString(),
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de'}/auth/callback`,
      },
    });

    if (signUpError) {
      console.error('[Signup Error]', signUpError);
      return NextResponse.json(
        { error: signUpError.message || 'Failed to sign up' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      );
    }

    // Benutzer-Profil in der öffentlichen Tabelle erstellen
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email,
        full_name,
        avatar_url: null,
        subscription_plan: 'free',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('[Profile Creation Error]', profileError);
      // Nicht kritisch - Benutzer kann trotzdem einloggen
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name,
        },
        message: 'Please check your email to verify your account',
        requiresEmailVerification: !data.user.confirmed_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error('[Signup Error]', error.message);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
