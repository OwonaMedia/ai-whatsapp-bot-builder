import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata, Viewport } from 'next';
import { config } from '@/lib/config';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

const baseUrl = config.app.url || 'https://whatsapp.owona.de';
const ogImage = `${baseUrl}/og-image.jpg`;
const siteTitle = 'WhatsApp Bot Builder';
const siteDescription = 'DSGVO-konforme WhatsApp Business Bot Builder - Erstelle AI-gestützte WhatsApp Bots ohne Code';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    'WhatsApp Bot',
    'WhatsApp Business API',
    'Chatbot',
    'AI Bot',
    'DSGVO',
    'WhatsApp Automation',
    'WhatsApp Bot Builder',
    'WhatsApp Business Chatbot',
    'AI WhatsApp Bot',
    'DSGVO-konformer Chatbot',
    'WhatsApp RAG Chatbot',
    'WhatsApp Bot ohne Code',
    'WhatsApp Business API Deutschland',
    'EU-Datenhaltung WhatsApp',
  ],
  authors: [{ name: 'Owona', url: 'https://www.owona.de' }],
  creator: 'Owona',
  publisher: 'Owona',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: baseUrl,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
    creator: '@owona', // Falls vorhanden
    site: '@owona', // Falls vorhanden
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      'de': `${baseUrl}/de`,
      'en': `${baseUrl}/en`,
      'es': `${baseUrl}/es`,
      'fr': `${baseUrl}/fr`,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID, // In .env einfügen
    // yandex: process.env.YANDEX_VERIFICATION_ID,
    // bing: process.env.BING_VERIFICATION_ID,
  },
};

export const viewport: Viewport = {
  themeColor: '#25D366',
};

/**
 * Root Layout - Required by Next.js
 * Renders html and body tags - LocaleLayout only renders content
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="lazyOnload"
        />
        <Script id="facebook-init" strategy="lazyOnload">
          {`
            window.fbAsyncInit = function() {
              window.FB?.init({
                appId: '${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || ''}',
                cookie: true,
                xfbml: true,
                version: 'v18.0'
              });
            };
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

