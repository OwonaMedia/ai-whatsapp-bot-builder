/**
 * Application Configuration
 * Domain: whatsapp.owona.de
 */

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'WhatsApp Bot Builder',
    domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'whatsapp.owona.de',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de',
    environment: process.env.NODE_ENV || 'development',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  whatsapp: {
    bspApiUrl: process.env.WHATSAPP_BSP_API_URL,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de'}/api/webhooks/whatsapp`,
  },
  ai: {
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
  },
} as const;

// Validation (nur zur Laufzeit in Production, nicht während Build)
// Build-Zeit: Environment-Variablen können fehlen
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  process.env.VERCEL !== '1' && // Vercel Build
  !process.env.NEXT_PHASE && // Next.js Build Phase
  (!config.supabase.url || !config.supabase.anonKey)
) {
  // Warnung statt Error (kann während Build fehlen)
  console.warn('⚠️ Missing Supabase environment variables - ensure they are set in production');
}

