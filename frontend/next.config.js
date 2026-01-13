const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Aktiviert detaillierte Hydration-Fehler im Development
  reactStrictMode: true,

  // Für besseres Debugging von Hydration-Fehlern
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // OpenTelemetry ist bereits durch entfernte Dependencies deaktiviert

  // Webpack-Konfiguration: Ignoriere Node.js-spezifische Module im Browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Im Browser: Ignoriere Node.js-spezifische Module
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
        events: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Fallback für Node.js Module im Build (nur für den Build-Prozess, nicht für Runtime)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    // Letzter Rettungsversuch: Deaktiviere problematische Module komplett
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      stream: false,
      crypto: false,
    };

    return config;
  },

  // Security Headers (Reconstructed from WHATSAPP_BOT_REVERSE_ENGINEERING_DATABASE.md)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://*.whatsapp.com; frame-ancestors 'self' https://*.facebook.com https://*.whatsapp.com;",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
