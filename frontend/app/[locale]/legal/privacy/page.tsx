import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung für WhatsApp Bot Builder',
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const basePath = locale ? `/${locale}` : '';
  
  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Datenschutzerklärung</h1>
          
          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm">
              Soweit nachstehend keine anderen Angaben gemacht werden, ist die Bereitstellung Ihrer personenbezogenen Daten weder gesetzlich oder vertraglich vorgeschrieben, noch für einen Vertragsabschluss erforderlich. Sie sind zur Bereitstellung der Daten nicht verpflichtet. Eine Nichtbereitstellung hat keine Folgen. Dies gilt nur soweit bei den nachfolgenden Verarbeitungsvorgängen keine anderweitige Angabe gemacht wird.<br />
              &quot;Personenbezogene Daten&quot; sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.
            </p>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">1. Verantwortlicher</h2>
              <p className="text-sm">
                <strong>Verantwortlicher für die Datenverarbeitung:</strong><br />
                Sandra Owona / Owona Media Agency<br />
                Ahornstraße 52<br />
                68542 Heddesheim<br />
                Deutschland<br />
                Telefon: +49 6203 9375214<br />
                E-Mail: shop@owona.de<br />
                Website: whatsapp.owona.de
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">2. Server-Logfiles</h2>
              <p className="text-sm">
                Sie können unsere Webseiten besuchen, ohne Angaben zu Ihrer Person zu machen.<br />
                Bei jedem Zugriff auf unsere Website werden an uns oder unseren Webhoster / IT-Dienstleister Nutzungsdaten durch Ihren Internet Browser übermittelt und in Protokolldaten (sog. Server-Logfiles) gespeichert. Zu diesen gespeicherten Daten gehören z.B. der Name der aufgerufenen Seite, Datum und Uhrzeit des Abrufs, die IP-Adresse, die übertragene Datenmenge und der anfragende Provider.<br />
                Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Gewährleistung eines störungsfreien Betriebs unserer Website sowie zur Verbesserung unseres Angebotes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">3. Kontaktaufnahme</h2>
              <p className="text-sm">
                <strong>Initiativ-Kontaktaufnahme des Kunden per E-Mail</strong><br />
                Wenn Sie per E-Mail initiativ mit uns in Geschäftskontakt treten, erheben wir Ihre personenbezogenen Daten (Name, E-Mail-Adresse, Nachrichtentext) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient der Bearbeitung und Beantwortung Ihrer Kontaktanfrage.<br />
                Wenn die Kontaktaufnahme der Durchführung vorvertraglicher Maßnahmen (bspw. Beratung bei Kaufinteresse, Angebotserstellung) dient oder einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO.<br />
                Erfolgt die Kontaktaufnahme aus anderen Gründen, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Bearbeitung und Beantwortung Ihrer Anfrage. <strong><em>In diesem Fall haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser auf Art. 6 Abs. 1 lit. f DSGVO beruhenden Verarbeitungen Sie betreffender personenbezogener Daten zu widersprechen.</em></strong><br />
                Ihre E-Mail-Adresse nutzen wir nur zur Bearbeitung Ihrer Anfrage. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">4. Nutzerkonto und Registrierung</h2>
              <p className="text-sm">
                Bei der Registrierung und Nutzung eines Nutzerkontos erheben wir Ihre personenbezogenen Daten (E-Mail-Adresse, Passwort, ggf. Name) in dem von Ihnen angegebenen Umfang. Die Datenverarbeitung dient dem Zweck der Bereitstellung unserer SaaS-Plattform &quot;WhatsApp Bot Builder&quot; sowie der Erfüllung unserer vertraglichen Pflichten.<br />
                Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung des mit uns geschlossenen Vertrages.<br />
                Sie können Ihr Nutzerkonto jederzeit löschen, indem Sie uns kontaktieren oder die Löschfunktion in Ihrem Nutzerkonto nutzen. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">5. WhatsApp Business API Integration</h2>
              
              <h3 className="font-semibold mt-4 mb-2">5.1 Nutzung der WhatsApp Business API über Business Solution Provider (BSP)</h3>
              <p className="text-sm">
                Zur Nutzung unserer SaaS-Plattform ist eine Verbindung mit einem Business Solution Provider (BSP) für die WhatsApp Business API erforderlich. Wir unterstützen folgende BSPs:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>360dialog</strong> (360dialog GmbH, EU-basiert, Datenhaltung in der EU)</li>
                <li><strong>Twilio</strong> (Twilio Inc., mit optionaler EU-Data-Residency)</li>
                <li><strong>MessageBird</strong> (MessageBird B.V., DSGVO-konform mit AVV)</li>
              </ul>
              <p className="text-sm mt-3">
                Bei der Verbindung mit einem BSP über unseren OAuth-Flow werden folgende Daten an den jeweiligen BSP übertragen:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Bot-Konfiguration (Flow-Daten, Bot-Einstellungen) - <strong>KEINE personenbezogenen Kundendaten</strong></li>
                <li>OAuth-Zugangsdaten (verschlüsselt gespeichert)</li>
                <li>Webhook-Konfiguration</li>
              </ul>
              <p className="text-sm mt-3">
                <strong>Wichtig:</strong> Personenbezogene Daten Ihrer WhatsApp-Kunden (Telefonnummern, Nachrichteninhalte) werden <strong>NICHT</strong> an den BSP übertragen. Diese bleiben in Ihrer Kontrolle und werden direkt zwischen WhatsApp und Ihrem Bot über unsere Plattform verarbeitet.
              </p>
              <p className="text-sm mt-3">
                Die Datenverarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung des mit uns geschlossenen Vertrages sowie auf Grundlage Ihrer ausdrücklichen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, die Sie im Setup-Wizard erteilen.<br />
                Sie können die Einwilligung jederzeit widerrufen, indem Sie die BSP-Verbindung in Ihrem Nutzerkonto trennen. Die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung bleibt davon unberührt.
              </p>

              <h3 className="font-semibold mt-4 mb-2">5.2 Auftragsverarbeitungsvertrag (AVV)</h3>
              <p className="text-sm">
                Die von Ihnen gewählten BSPs agieren als Auftragsverarbeiter gemäß Art. 28 DSGVO. Wir haben mit den BSPs entsprechende Verträge zur Auftragsverarbeitung abgeschlossen oder stellen diese im Rahmen des Setups bereit.<br />
                Ihre personenbezogenen Daten (E-Mail, Kontodaten) werden nicht an die BSPs weitergegeben. Lediglich die für den Betrieb der WhatsApp Business API erforderlichen technischen Konfigurationsdaten werden übertragen.
              </p>

              <h3 className="font-semibold mt-4 mb-2">5.3 Speicherung und Verschlüsselung</h3>
              <p className="text-sm">
                OAuth-Zugangsdaten (Access Tokens) werden verschlüsselt in unserer Datenbank gespeichert. Wir verwenden AES-256-GCM Verschlüsselung. In Production verwenden wir Supabase Vault für zusätzliche Sicherheit.<br />
                Die Verschlüsselung erfolgt auf Grundlage des Art. 32 DSGVO (technische und organisatorische Maßnahmen zur Gewährleistung der Sicherheit der Verarbeitung).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">6. Verarbeitung von WhatsApp-Nachrichten</h2>
              <p className="text-sm">
                Wenn Sie unsere Plattform nutzen, um WhatsApp-Bots zu erstellen und zu betreiben, werden Nachrichten zwischen Ihren Kunden und Ihrem Bot über unsere Infrastruktur verarbeitet.
              </p>
              <p className="text-sm mt-2">
                <strong>Daten, die wir verarbeiten:</strong>
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Telefonnummern der Kunden (gehasht gespeichert für Privacy)</li>
                <li>Nachrichteninhalte (temporär während der Verarbeitung)</li>
                <li>Bot-Konversationsverläufe (gespeichert in Ihrer Datenbank, nicht in unserer)</li>
                <li>Metadaten (Zeitstempel, Bot-ID, etc.)</li>
              </ul>
              <p className="text-sm mt-3">
                Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung des mit uns geschlossenen Vertrages (Bereitstellung der SaaS-Plattform).<br />
                Als Verantwortlicher für die Verarbeitung der Kundendaten Ihrer WhatsApp-Bots sind Sie verpflichtet, selbst eine Datenschutzerklärung für Ihre Kunden bereitzustellen und die entsprechenden Rechtsgrundlagen zu erfüllen.
              </p>
              <p className="text-sm mt-2">
                <strong>Speicherdauer:</strong> Wir speichern Nachrichteninhalte nur temporär während der Verarbeitung. Gespeicherte Konversationsverläufe in Ihrer Datenbank unterliegen Ihrer Kontrolle und können von Ihnen jederzeit gelöscht werden.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">7. Künstliche Intelligenz (AI) und Embeddings</h2>
              <p className="text-sm">
                Unsere Plattform nutzt Künstliche Intelligenz für die Bot-Antworten. Hierbei können folgende externe Dienste genutzt werden:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>GROQ API</strong> (GROQ Inc., USA) - für Textgenerierung (Llama 3.3 Modelle)</li>
                <li><strong>OpenAI API</strong> (OpenAI LLC, USA) - optional für Embeddings</li>
                <li><strong>Hugging Face Inference API</strong> (Hugging Face Inc., USA/EU) - optional für kostenlose Embeddings</li>
              </ul>
              <p className="text-sm mt-3">
                Bei der Nutzung dieser Dienste werden Nachrichteninhalte zur Verarbeitung an die jeweiligen Anbieter übermittelt. Für die USA existiert ein Angemessenheitsbeschluss der EU-Kommission (Trans-Atlantic Data Privacy Framework). GROQ, OpenAI und Hugging Face sind nach dem TADPF zertifiziert oder bieten Standardvertragsklauseln an.<br />
                Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung des Vertrages sowie Art. 6 Abs. 1 lit. f DSGVO aus unserem berechtigten Interesse an der Bereitstellung AI-gestützter Funktionen.
              </p>
              <p className="text-sm mt-2">
                <strong>Embeddings:</strong> Zur Verbesserung der Bot-Antworten durch RAG (Retrieval Augmented Generation) erstellen wir Embeddings aus hochgeladenen Dokumenten (PDFs, URLs, Texten). Diese Embeddings werden in unserer EU-basierten Datenbank gespeichert (Supabase).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">8. Supabase (Datenbank)</h2>
              <p className="text-sm">
                Wir nutzen Supabase (Supabase Inc., USA) als Datenbank- und Backend-Service. Supabase ist nach dem Trans-Atlantic Data Privacy Framework (TADPF) zertifiziert und bietet Standardvertragsklauseln sowie EU-Data-Residency-Optionen an.<br />
                Ihre Daten können in den USA verarbeitet werden. Wir nutzen Supabase&apos;s EU-Region, wenn verfügbar.<br />
                Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung des Vertrages.<br />
                Nähere Informationen: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://supabase.com/privacy</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">9. Cookies und ähnliche Technologien</h2>
              <p className="text-sm">
                Wir verwenden Cookies und ähnliche Technologien auf unserer Website. Nähere Informationen finden Sie in unserer <Link href={`${basePath}/legal/cookies`} className="text-brand-green hover:underline">Cookie-Richtlinie</Link>.
              </p>
              <p className="text-sm mt-2">
                Die Nutzung von Cookies erfolgt mit Ihrer Einwilligung auf Grundlage des § 25 Abs. 1 S. 1 TTDSG i.V.m. Art. 6 Abs. 1 lit. a DSGVO. Sie können die Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">10. Ihre Rechte</h2>
              <p className="text-sm">Sie haben folgende Rechte:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie können Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten verlangen.</li>
                <li><strong>Berichtigung</strong> (Art. 16 DSGVO): Sie können die Berichtigung unrichtiger Daten verlangen.</li>
                <li><strong>Löschung</strong> (Art. 17 DSGVO): Sie können die Löschung Ihrer Daten verlangen.</li>
                <li><strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO): Sie können die Einschränkung der Verarbeitung verlangen.</li>
                <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Sie können Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format erhalten.</li>
                <li><strong>Widerspruch</strong> (Art. 21 DSGVO): Sie können der Verarbeitung Ihrer Daten aus Gründen, die sich aus Ihrer besonderen Situation ergeben, widersprechen.</li>
                <li><strong>Widerruf der Einwilligung</strong> (Art. 7 Abs. 3 DSGVO): Sie können erteilte Einwilligungen jederzeit widerrufen.</li>
              </ul>
              <p className="text-sm mt-3">
                Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter: <a href="mailto:shop@owona.de" className="text-brand-green hover:underline">shop@owona.de</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">11. Beschwerderecht</h2>
              <p className="text-sm">
                Sie haben das Recht, sich bei einer Aufsichtsbehörde über unsere Datenverarbeitung zu beschweren. Die für uns zuständige Aufsichtsbehörde ist:
              </p>
              <p className="text-sm mt-2">
                Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg<br />
                Königstraße 10a<br />
                70173 Stuttgart<br />
                Telefon: 0711/615541-0<br />
                E-Mail: poststelle@lfdi.bwl.de<br />
                Website: <a href="https://www.baden-wuerttemberg.datenschutz.de" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://www.baden-wuerttemberg.datenschutz.de</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">12. Datensicherheit</h2>
              <p className="text-sm">Wir verwenden technische und organisatorische Maßnahmen zum Schutz Ihrer personenbezogenen Daten:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Verschlüsselung der Datenübertragung (HTTPS/TLS)</li>
                <li>Verschlüsselung sensibler Daten in der Datenbank (Access Tokens)</li>
                <li>Zugriffskontrolle (Row Level Security in Supabase)</li>
                <li>Regelmäßige Sicherheits-Updates</li>
                <li>Authentifizierung und Autorisierung</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">13. Speicherdauer</h2>
              <p className="text-sm">
                Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. Nach Ablauf dieser Fristen werden die Daten routinemäßig gelöscht.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">14. Änderungen der Datenschutzerklärung</h2>
              <p className="text-sm">
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
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

