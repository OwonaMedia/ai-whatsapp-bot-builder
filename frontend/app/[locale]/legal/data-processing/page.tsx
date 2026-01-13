import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Auftragsverarbeitung (AVV)',
  description: 'Informationen zur Auftragsverarbeitung gemäß Art. 28 DSGVO',
};

export default function DataProcessingPage() {
  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Informationen zur Auftragsverarbeitung (AVV)</h1>
          
          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm">
              Im Rahmen der Nutzung unserer SaaS-Plattform &quot;WhatsApp Bot Builder&quot; erfolgt eine Auftragsverarbeitung gemäß Art. 28 DSGVO.
            </p>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">1. Auftragsverarbeiter</h2>
              <p className="text-sm">
                Wir (Sandra Owona / Owona Media Agency) sind Verantwortlicher für die Verarbeitung Ihrer personenbezogenen Daten (Kontodaten, E-Mail-Adresse, etc.).
              </p>
              <p className="text-sm mt-2">
                Als Auftragsverarbeiter agieren folgende Dienstleister:
              </p>

              <h3 className="font-semibold mt-4 mb-2">1.1 Supabase (Datenbank-Service)</h3>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992</li>
                <li><strong>Art der Verarbeitung:</strong> Speicherung und Verarbeitung von Daten in Cloud-Datenbanken</li>
                <li><strong>Verarbeitete Daten:</strong> Nutzerkontodaten, Bot-Konfigurationen, Konversationsverläufe (falls gespeichert)</li>
                <li><strong>AVV:</strong> Supabase bietet Standardvertragsklauseln (SCC) gemäß Art. 46 DSGVO an</li>
                <li><strong>Datenstandort:</strong> USA (mit EU-Data-Residency-Option)</li>
                <li><strong>Zertifizierung:</strong> Trans-Atlantic Data Privacy Framework (TADPF)</li>
                <li><strong>Nähere Informationen:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://supabase.com/privacy</a></li>
              </ul>

              <h3 className="font-semibold mt-4 mb-2">1.2 Business Solution Provider (BSP) für WhatsApp Business API</h3>
              <p className="text-sm">
                Bei der Verbindung mit einem BSP (360dialog, Twilio, MessageBird) agiert dieser als zusätzlicher Auftragsverarbeiter für die WhatsApp Business API. Die BSPs verarbeiten <strong>KEINE</strong> personenbezogenen Kundendaten, sondern nur technische Konfigurationsdaten.
              </p>

              <h4 className="font-semibold mt-3 mb-2">1.2.1 360dialog</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> 360dialog GmbH, Deutschland/EU</li>
                <li><strong>Art der Verarbeitung:</strong> Bereitstellung der WhatsApp Business API, OAuth-Verwaltung</li>
                <li><strong>Verarbeitete Daten:</strong> Bot-Konfiguration (Flow-Daten), OAuth-Zugangsdaten, Webhook-Konfiguration</li>
                <li><strong>AVV:</strong> 360dialog stellt einen AVV gemäß Art. 28 DSGVO bereit</li>
                <li><strong>Datenstandort:</strong> EU (DSGVO-konform)</li>
                <li><strong>Nähere Informationen:</strong> <a href="https://360dialog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://360dialog.com/privacy</a></li>
              </ul>

              <h4 className="font-semibold mt-3 mb-2">1.2.2 Twilio</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> Twilio Inc., 101 Spear Street, San Francisco, CA 94105, USA</li>
                <li><strong>Art der Verarbeitung:</strong> Bereitstellung der WhatsApp Business API über Twilio</li>
                <li><strong>Verarbeitete Daten:</strong> Bot-Konfiguration, OAuth-Zugangsdaten</li>
                <li><strong>AVV:</strong> Twilio bietet einen AVV gemäß Art. 28 DSGVO sowie Standardvertragsklauseln an</li>
                <li><strong>Datenstandort:</strong> USA (mit optionaler EU-Data-Residency)</li>
                <li><strong>Zertifizierung:</strong> Trans-Atlantic Data Privacy Framework (TADPF)</li>
                <li><strong>Nähere Informationen:</strong> <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://www.twilio.com/legal/privacy</a></li>
              </ul>

              <h4 className="font-semibold mt-3 mb-2">1.2.3 MessageBird</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> MessageBird B.V., Trompenburgstraat 2C, 1079 TX Amsterdam, Niederlande</li>
                <li><strong>Art der Verarbeitung:</strong> Bereitstellung der WhatsApp Business API</li>
                <li><strong>Verarbeitete Daten:</strong> Bot-Konfiguration, OAuth-Zugangsdaten</li>
                <li><strong>AVV:</strong> MessageBird stellt einen AVV gemäß Art. 28 DSGVO bereit</li>
                <li><strong>Datenstandort:</strong> EU/Global (EU-Data-Residency möglich)</li>
                <li><strong>Nähere Informationen:</strong> <a href="https://www.messagebird.com/en/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://www.messagebird.com/en/legal/privacy</a></li>
              </ul>

              <h3 className="font-semibold mt-4 mb-2">1.3 KI-Service-Anbieter (optional)</h3>

              <h4 className="font-semibold mt-3 mb-2">1.3.1 GROQ</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> GROQ Inc., USA</li>
                <li><strong>Art der Verarbeitung:</strong> Textgenerierung für Bot-Antworten (Llama 3.3 Modelle)</li>
                <li><strong>Verarbeitete Daten:</strong> Nachrichteninhalte (temporär während der Verarbeitung)</li>
                <li><strong>AVV:</strong> Standardvertragsklauseln verfügbar</li>
                <li><strong>Zertifizierung:</strong> Trans-Atlantic Data Privacy Framework (TADPF)</li>
              </ul>

              <h4 className="font-semibold mt-3 mb-2">1.3.2 OpenAI (optional)</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> OpenAI LLC, USA</li>
                <li><strong>Art der Verarbeitung:</strong> Embedding-Generierung (falls genutzt)</li>
                <li><strong>Verarbeitete Daten:</strong> Textinhalte aus Dokumenten</li>
                <li><strong>AVV:</strong> Standardvertragsklauseln verfügbar</li>
                <li><strong>Zertifizierung:</strong> Trans-Atlantic Data Privacy Framework (TADPF)</li>
              </ul>

              <h4 className="font-semibold mt-3 mb-2">1.3.3 Hugging Face (optional)</h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Anbieter:</strong> Hugging Face Inc., USA/EU</li>
                <li><strong>Art der Verarbeitung:</strong> Embedding-Generierung (kostenlose Alternative)</li>
                <li><strong>Verarbeitete Daten:</strong> Textinhalte aus Dokumenten</li>
                <li><strong>AVV:</strong> Standardvertragsklauseln verfügbar</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">2. Maßnahmen zur Sicherheit der Verarbeitung</h2>
              <p className="text-sm">
                Wir haben mit allen Auftragsverarbeitern entsprechende technische und organisatorische Maßnahmen vereinbart:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Verschlüsselung der Datenübertragung (HTTPS/TLS)</li>
                <li>Verschlüsselung sensibler Daten in der Datenbank</li>
                <li>Zugriffskontrolle und Authentifizierung</li>
                <li>Regelmäßige Sicherheits-Updates</li>
                <li>Backup und Notfallwiederherstellung</li>
                <li>Audit-Logs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">3. Ihre Rechte</h2>
              <p className="text-sm">
                Als Betroffener haben Sie die in Art. 15-22 DSGVO genannten Rechte (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch). Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter: <a href="mailto:shop@owona.de" className="text-brand-green hover:underline">shop@owona.de</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">4. Kontakt</h2>
              <p className="text-sm">
                Sandra Owona / Owona Media Agency<br />
                Ahornstraße 52<br />
                68542 Heddesheim<br />
                Deutschland<br />
                Telefon: +49 6203 9375214<br />
                E-Mail: <a href="mailto:shop@owona.de" className="text-brand-green hover:underline">shop@owona.de</a>
              </p>
            </section>

            <p className="text-sm mt-6">
              <strong>Stand: Januar 2025</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

