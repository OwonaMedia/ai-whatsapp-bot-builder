module.exports = {
  apps: [{
    name: 'whatsapp-bot-builder',
    script: 'npm',
    args: 'run start',
    cwd: '/var/www/whatsapp-bot-builder/frontend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    // Memory-Limit für stabile Last - 1GB reicht
    max_memory_restart: '1024M',
    // Node.js Memory-Optionen - REDUZIERT für weniger GC-Pausen
    node_args: '--max-old-space-size=1024 --disable-proto=delete',
    error_file: '/var/log/pm2/whatsapp-bot-builder-error.log',
    out_file: '/var/log/pm2/whatsapp-bot-builder-out.log',
    log_file: '/var/log/pm2/whatsapp-bot-builder.log',
    time: true,
    // Auto-restart bei Fehlern
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Shutdown-Grace-Period
    kill_timeout: 5000,
    // Wait für Ready (deaktiviert für schnelleres Starten)
    wait_ready: false,
    listen_timeout: 30000,
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=1536',
      // Supabase Configuration (wird aus .env.local geladen)
      NEXT_PUBLIC_SUPABASE_URL: 'https://ugsezgnkyhcmsdpohuwf.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_adnvXge3RS1DNBHvXuP26A_BFcZQ4Rj',
      // App Configuration
      NEXT_PUBLIC_APP_URL: 'https://whatsapp.owona.de',
      NEXT_PUBLIC_APP_NAME: 'WhatsApp Bot Builder',
      NEXT_PUBLIC_APP_DOMAIN: 'whatsapp.owona.de',
      // Groq Configuration for Chat
      GROQ_API_KEY: 'gsk_REDACTED_FOR_SECURITY',
      // Facebook OAuth Configuration
      NEXT_PUBLIC_FACEBOOK_APP_ID: '1228279332187747',
      FACEBOOK_APP_SECRET: '861090362bf7b2951c7ce24a9f9d522a',
      // Internal Portal - IP-basierte Authentifizierung
      // ALLOWED_IPS: Liste von IPs (komma-separiert) oder mit Wildcard
      ALLOWED_IPS: '78.51.231.145',
      // Deprecated (Login entfernt, nur noch IP-basiert)
      INTERNAL_PORTAL_EMAIL: 'sm@owona.de',
      INTERNAL_PORTAL_PASSWORD_HASH: '$2b$10$clz1XX8unKp6yNISSn16Ve1MJEcTpo0iaq/7zAJ/elw.wNw65HGgW',
      INTERNAL_PORTAL_SECRET: 'InternalPortalSecret2024SafeToken',
      DISABLE_OTEL: 'true',
      ENABLE_OTEL_TRACING: 'false',
    },
  }],
};


