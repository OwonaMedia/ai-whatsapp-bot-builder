'use client';

import { useEffect } from 'react';

interface StructuredDataProps {
  data: Record<string, any>;
  type?: string;
}

/**
 * Structured Data Component - Fügt JSON-LD Schema.org Markup hinzu
 * Wichtig für Google AI Mode und Search Engine Understanding
 */
export default function StructuredData({ data, type = 'application/ld+json' }: StructuredDataProps) {
  useEffect(() => {
    // Script-Tag erstellen und zum Head hinzufügen
    const script = document.createElement('script');
    script.type = type;
    script.text = JSON.stringify(data);
    script.id = `structured-data-${Date.now()}`;
    
    document.head.appendChild(script);
    
    // Cleanup: Script-Tag entfernen beim Unmount
    return () => {
      const existingScript = document.getElementById(script.id);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [data, type]);
  
  return null;
}

/**
 * SoftwareApplication Schema - Für WhatsApp Bot Builder
 */
export function SoftwareApplicationSchema() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.owona.de';
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WhatsApp Bot Builder',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '29',
      priceCurrency: 'EUR',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/pricing`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    description: 'DSGVO-konformer WhatsApp Business Bot Builder - Erstelle AI-gestützte WhatsApp Bots ohne Code. Vollständig konform mit DSGVO, EU-Datenhaltung und WhatsApp Business API.',
    featureList: [
      'AI-gestützte Chatbots',
      'DSGVO-konform',
      'EU-Datenhaltung',
      'Keine Programmierkenntnisse erforderlich',
      'Real-time Analytics',
      'Multi-Channel Support',
      'PDF & URL Wissensquellen',
      'Automatische Embeddings',
    ],
    screenshot: `${baseUrl}/screenshots/dashboard-demo.png`,
    url: baseUrl,
    sameAs: [
      'https://www.owona.de',
      // Social Media Links hier einfügen, wenn vorhanden
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Owona',
      url: 'https://www.owona.de',
    },
  };
  
  return <StructuredData data={schema} />;
}

/**
 * Organization Schema - Für Owona
 */
export function OrganizationSchema() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.owona.de';
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Owona',
    url: 'https://www.owona.de',
    logo: `${baseUrl}/logo.png`,
    description: 'Owona entwickelt innovative SaaS-Lösungen für den deutschen Markt mit Fokus auf DSGVO-Konformität und EU-Datenhaltung.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Kundensupport',
      email: 'support@owona.de',
      availableLanguage: ['German', 'English'],
    },
    sameAs: [
      // Social Media Links hier einfügen, wenn vorhanden
    ],
  };
  
  return <StructuredData data={schema} />;
}

/**
 * FAQPage Schema - Für FAQ-Seite
 */
export function FAQPageSchema(faqs: Array<{ question: string; answer: string }>) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  
  return <StructuredData data={schema} />;
}

/**
 * BreadcrumbList Schema - Für Navigation
 */
export function BreadcrumbListSchema(items: Array<{ name: string; url: string }>) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.owona.de';
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
  
  return <StructuredData data={schema} />;
}

/**
 * HowTo Schema - Für Schritt-für-Schritt-Anleitungen
 */
export function HowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
}) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://whatsapp.owona.de';
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: step.image.startsWith('http') ? step.image : `${baseUrl}${step.image}`,
      }),
    })),
  };
  
  return <StructuredData data={schema} />;
}

