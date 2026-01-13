export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Minimale Version mit params
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', 
      color: '#f1f5f9', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
          WhatsApp Bot Builder
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: '#cbd5e1' }}>
          DSGVO-konforme WhatsApp Business Bot Builder
        </p>
        <a
          href="/de/auth/signup"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.75rem',
            fontWeight: '600'
          }}
        >
          Jetzt starten
        </a>
      </div>
    </div>
  );
}
