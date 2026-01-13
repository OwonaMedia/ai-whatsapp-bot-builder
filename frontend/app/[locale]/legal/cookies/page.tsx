import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie-Richtlinie',
  description: 'Informationen zur Verwendung von Cookies auf unserer Website',
};

export default function CookiesPage() {
  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Cookie-Richtlinie</h1>
          
          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm">
              Diese Cookie-Richtlinie informiert Sie über die Verwendung von Cookies und ähnlichen Technologien auf unserer Website whatsapp.owona.de.
            </p>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">1. Was sind Cookies?</h2>
              <p className="text-sm">
                Cookies sind kleine Textdateien, die auf Ihrem Endgerät (Computer, Smartphone, Tablet) gespeichert werden, wenn Sie unsere Website besuchen. Cookies enthalten Informationen, die es uns ermöglichen, die Website zu optimieren und Ihnen die bestmögliche Nutzererfahrung zu bieten.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">2. Rechtliche Grundlage</h2>
              <p className="text-sm">
                Die Nutzung von Cookies erfolgt mit Ihrer Einwilligung auf Grundlage des § 25 Abs. 1 S. 1 TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz) i.V.m. Art. 6 Abs. 1 lit. a DSGVO. Sie können Ihre Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">3. Arten von Cookies</h2>
              
              <h3 className="font-semibold mt-4 mb-2">3.1 Notwendige Cookies (Essentiell)</h3>
              <p className="text-sm">
                Diese Cookies sind für das Funktionieren der Website unbedingt erforderlich und können nicht deaktiviert werden. Sie werden in der Regel nur als Reaktion auf von Ihnen durchgeführte Aktionen gesetzt, die einer Dienstanfrage entsprechen (z.B. Anmeldedaten speichern, Sprachauswahl).
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>next-auth.session-token</strong> - Speichert Ihre Anmeldedaten für die Session (Dauer: Session)</li>
                <li><strong>NEXT_LOCALE</strong> - Speichert Ihre Spracheinstellung (Dauer: 1 Jahr)</li>
                <li><strong>cookie_consent</strong> - Speichert Ihre Cookie-Einstellungen (Dauer: 1 Jahr)</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Funktionsfähigkeit der Website)
              </p>

              <h3 className="font-semibold mt-4 mb-2">3.2 Funktionale Cookies</h3>
              <p className="text-sm">
                Diese Cookies ermöglichen es der Website, erweiterte Funktionalität und Personalisierung bereitzustellen. Sie können von uns oder von Drittanbietern gesetzt werden, deren Dienste wir auf unseren Seiten verwenden.
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>react-flow</strong> - Speichert Position und Zustand des Bot-Builders (Dauer: Session)</li>
                <li><strong>bot_builder_autosave</strong> - Speichert automatische Zwischenspeicherungen beim Bot-Builder (Dauer: Session)</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
              </p>

              <h3 className="font-semibold mt-4 mb-2">3.3 Analyse-Cookies (Optional)</h3>
              <p className="text-sm">
                Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website interagieren, indem Informationen anonym gesammelt und gemeldet werden.<br />
                Derzeit nutzen wir <strong>keine</strong> Analyse-Cookies (z.B. Google Analytics). Falls wir in Zukunft Analyse-Tools einsetzen, informieren wir Sie hierüber und holen Ihre Einwilligung ein.
              </p>
              <p className="text-sm mt-2">
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
              </p>

              <h3 className="font-semibold mt-4 mb-2">3.4 Marketing-Cookies (Optional)</h3>
              <p className="text-sm">
                Diese Cookies werden verwendet, um Besuchern relevante Werbung und Marketingkampagnen bereitzustellen. Diese Cookies verfolgen Besucher über Websites hinweg und sammeln Informationen, um maßgeschneiderte Werbung bereitzustellen.<br />
                Derzeit nutzen wir <strong>keine</strong> Marketing-Cookies.
              </p>
              <p className="text-sm mt-2">
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung)
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">4. Drittanbieter-Cookies</h2>
              <p className="text-sm">
                Wir setzen keine Cookies von Drittanbietern, mit Ausnahme der oben genannten notwendigen Cookies für die Funktionalität unserer Website.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">5. Lokaler Speicher (Local Storage / Session Storage)</h2>
              <p className="text-sm">
                Zusätzlich zu Cookies verwenden wir lokalen Speicher (Local Storage und Session Storage) Ihres Browsers, um bestimmte Informationen lokal zu speichern:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Session Storage:</strong> Temporäre Daten während Ihrer Sitzung (z.B. Bot-Builder-Zustand)</li>
                <li><strong>Local Storage:</strong> Persistente Einstellungen (z.B. UI-Präferenzen)</li>
              </ul>
              <p className="text-sm mt-2">
                Diese Daten werden nur lokal auf Ihrem Gerät gespeichert und nicht an uns übertragen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">6. Cookie-Verwaltung</h2>
              <p className="text-sm">
                Sie können Ihre Cookie-Einstellungen jederzeit in unserem Cookie-Banner ändern oder Cookies in Ihren Browser-Einstellungen verwalten:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li><strong>Chrome:</strong> Einstellungen &gt; Datenschutz und Sicherheit &gt; Cookies und andere Websitedaten</li>
                <li><strong>Firefox:</strong> Einstellungen &gt; Datenschutz &amp; Sicherheit &gt; Cookies und Website-Daten</li>
                <li><strong>Safari:</strong> Einstellungen &gt; Datenschutz &gt; Cookies und Website-Daten</li>
                <li><strong>Edge:</strong> Einstellungen &gt; Cookies und Websiteberechtigungen</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>Wichtig:</strong> Wenn Sie Cookies deaktivieren, können einige Funktionen der Website möglicherweise nicht mehr ordnungsgemäß funktionieren.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">7. Do Not Track (DNT)</h2>
              <p className="text-sm">
                Wir respektieren die &quot;Do Not Track&quot;-Einstellung Ihres Browsers. Wenn DNT aktiviert ist, werden keine optionalen Cookies gesetzt.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">8. Änderungen dieser Cookie-Richtlinie</h2>
              <p className="text-sm">
                Wir behalten uns vor, diese Cookie-Richtlinie anzupassen. Über wesentliche Änderungen informieren wir Sie über unsere Website oder per E-Mail.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">9. Kontakt</h2>
              <p className="text-sm">
                Bei Fragen zur Cookie-Richtlinie kontaktieren Sie uns bitte:
              </p>
              <p className="text-sm mt-2">
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

