import { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nutzungsbedingungen',
  description: 'Allgemeine Geschäftsbedingungen für WhatsApp Bot Builder',
};

export default async function TermsPage({
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
          <h1 className="text-2xl font-bold mb-6">Allgemeine Nutzungsbedingungen (AGB)</h1>
          
          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm">
              <strong>Stand: Januar 2025</strong>
            </p>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">1. Geltungsbereich und Vertragsparteien</h2>
              <p className="text-sm">
                <strong>1.1 Geltungsbereich</strong><br />
                Diese Allgemeinen Nutzungsbedingungen (nachfolgend &quot;AGB&quot;) regeln die Nutzung der SaaS-Plattform &quot;WhatsApp Bot Builder&quot; (nachfolgend &quot;Plattform&quot; oder &quot;Service&quot;) der Owona Media Agency (nachfolgend &quot;Anbieter&quot;, &quot;wir&quot; oder &quot;uns&quot;).<br />
                Die Plattform ermöglicht es Nutzern, WhatsApp-Bots zu erstellen, zu konfigurieren und zu betreiben.
              </p>
              <p className="text-sm mt-2">
                <strong>1.2 Vertragsparteien</strong><br />
                <strong>Anbieter:</strong><br />
                Sandra Owona / Owona Media Agency<br />
                Ahornstraße 52<br />
                68542 Heddesheim<br />
                Deutschland<br />
                Telefon: +49 6203 9375214<br />
                E-Mail: shop@owona.de<br />
                Website: whatsapp.owona.de
              </p>
              <p className="text-sm mt-2">
                <strong>Nutzer:</strong> Jede natürliche oder juristische Person, die die Plattform nutzt (nachfolgend &quot;Nutzer&quot; oder &quot;Sie&quot;).
              </p>
              <p className="text-sm mt-2">
                <strong>1.3 Abweichende Regelungen</strong><br />
                Abweichende, entgegenstehende oder ergänzende AGB des Nutzers werden nicht Vertragsbestandteil, es sei denn, ihrer Geltung wird ausdrücklich schriftlich zugestimmt.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">2. Leistungsgegenstand und Funktionsumfang</h2>
              <p className="text-sm">
                <strong>2.1 Leistungsgegenstand</strong><br />
                Der Anbieter stellt eine Software-as-a-Service (SaaS) Plattform zur Verfügung, die es Nutzern ermöglicht:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>WhatsApp-Bots zu erstellen und zu konfigurieren</li>
                <li>Bot-Flows visuell zu gestalten (Flow-Builder)</li>
                <li>WhatsApp Business API über Business Solution Provider (BSP) zu integrieren</li>
                <li>KI-gestützte Bot-Antworten zu konfigurieren</li>
                <li>Wissensquellen (PDFs, URLs, Texte) für Bot-Antworten hochzuladen</li>
                <li>Analytics und Statistiken zu Bot-Konversationen einzusehen</li>
                <li>Bots zu testen und zu verwalten</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>2.2 Funktionsumfang</strong><br />
                Der genaue Funktionsumfang richtet sich nach dem gewählten Tarif. Der Anbieter behält sich vor, Funktionen zu ändern, zu erweitern oder einzuschränken, sofern dies dem Nutzer zumutbar ist und die Kernfunktionalität erhalten bleibt.
              </p>
              <p className="text-sm mt-2">
                <strong>2.3 Verfügbarkeit</strong><br />
                Der Anbieter bemüht sich um eine hohe Verfügbarkeit der Plattform (Ziel: 99,5% Uptime). Geplante Wartungsarbeiten werden, soweit möglich, vorher angekündigt. Für unvorhergesehene Ausfälle, Wartungsarbeiten oder technische Störungen kann keine Haftung übernommen werden.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">3. Registrierung und Nutzerkonto</h2>
              <p className="text-sm">
                <strong>3.1 Registrierung</strong><br />
                Für die Nutzung der Plattform ist eine Registrierung erforderlich. Der Nutzer verpflichtet sich, bei der Registrierung wahrheitsgemäße, vollständige und aktuelle Angaben zu machen.
              </p>
              <p className="text-sm mt-2">
                <strong>3.2 Nutzerkonto</strong><br />
                Jeder Nutzer erhält ein persönliches, nicht übertragbares Nutzerkonto. Der Nutzer ist verpflichtet, sein Passwort geheim zu halten und Dritten keinen Zugang zu seinem Nutzerkonto zu gewähren. Der Nutzer haftet für alle Handlungen, die unter Verwendung seines Nutzerkontos erfolgen.
              </p>
              <p className="text-sm mt-2">
                <strong>3.3 Kündigung des Nutzerkontos</strong><br />
                Der Nutzer kann sein Nutzerkonto jederzeit löschen, indem er die Löschfunktion in seinem Nutzerkonto nutzt oder den Anbieter kontaktiert. Der Anbieter kann das Nutzerkonto aus wichtigem Grund, insbesondere bei Verstößen gegen diese AGB, kündigen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">4. Nutzungsrechte und Einschränkungen</h2>
              <p className="text-sm">
                <strong>4.1 Einräumung von Nutzungsrechten</strong><br />
                Der Anbieter räumt dem Nutzer das nicht-exklusive, nicht übertragbare, zeitlich auf die Vertragslaufzeit beschränkte Recht ein, die Plattform im Rahmen des gewählten Tarifs zu nutzen.
              </p>
              <p className="text-sm mt-2">
                <strong>4.2 Verbotene Nutzung</strong><br />
                Der Nutzer verpflichtet sich, die Plattform nicht zu nutzen für:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Illegale Zwecke oder zur Verletzung von Rechten Dritter</li>
                <li>Spam, Phishing oder betrügerische Aktivitäten</li>
                <li>Verbreitung von Malware, Viren oder schädlichem Code</li>
                <li>Verletzung von Urheberrechten, Markenrechten oder anderen geistigen Eigentumsrechten</li>
                <li>Belästigung, Diskriminierung oder Verletzung der Persönlichkeitsrechte Dritter</li>
                <li>Manipulation oder unbefugte Zugriffe auf Systeme Dritter</li>
                <li>Verletzung von WhatsApp Business API Richtlinien oder Bedingungen der Business Solution Provider (BSP)</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>4.3 Verantwortlichkeit des Nutzers</strong><br />
                Der Nutzer ist für die Inhalte seiner Bots und deren Konformität mit geltendem Recht (insbesondere DSGVO, TMG, WhatsApp Business API Richtlinien) verantwortlich. Der Nutzer stellt den Anbieter von allen Ansprüchen Dritter frei, die aufgrund einer rechtswidrigen Nutzung der Plattform durch den Nutzer entstehen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">5. WhatsApp Business API Integration</h2>
              <p className="text-sm">
                <strong>5.1 BSP-Verbindung</strong><br />
                Für die Nutzung der Plattform ist eine Verbindung mit einem Business Solution Provider (BSP) für die WhatsApp Business API erforderlich. Der Nutzer ist selbst verantwortlich für die Einrichtung und Aufrechterhaltung dieser Verbindung. Der Anbieter unterstützt die Verbindung mit verschiedenen BSPs (360dialog, Twilio, MessageBird), übernimmt jedoch keine Haftung für die Verfügbarkeit oder Funktionalität der BSP-Dienste.
              </p>
              <p className="text-sm mt-2">
                <strong>5.2 WhatsApp Business API Richtlinien</strong><br />
                Der Nutzer verpflichtet sich, die WhatsApp Business API Richtlinien und die Bedingungen seines gewählten BSPs einzuhalten. Verstöße gegen diese Richtlinien können zur Sperrung des Nutzerkontos führen. Der Anbieter übernimmt keine Haftung für Sperrungen durch WhatsApp oder BSPs aufgrund von Verstößen des Nutzers.
              </p>
              <p className="text-sm mt-2">
                <strong>5.3 OAuth-Zugangsdaten</strong><br />
                OAuth-Zugangsdaten (Access Tokens) werden verschlüsselt gespeichert. Der Nutzer ist verantwortlich, seine Zugangsdaten sicher aufzubewahren und nicht an Dritte weiterzugeben.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">6. Preise und Zahlungsbedingungen</h2>
              <p className="text-sm">
                <strong>6.1 Preise</strong><br />
                Die Preise für die Nutzung der Plattform richten sich nach dem gewählten Tarif. Alle Preise verstehen sich in Euro zzgl. gesetzlicher Umsatzsteuer. Die Preise können sich ändern; der Nutzer wird über Preiserhöhungen mindestens 30 Tage im Voraus informiert.
              </p>
              <p className="text-sm mt-2">
                <strong>6.2 Zahlungsbedingungen</strong><br />
                Die Zahlung erfolgt im Voraus für die jeweilige Abrechnungsperiode (monatlich oder jährlich). Zahlungsmethoden sind per PayPal oder per Banküberweisung. Bei Zahlungsverzug ist der Anbieter berechtigt, die Leistungen zu sperren.
              </p>
              <p className="text-sm mt-2">
                <strong>6.3 Rückerstattung</strong><br />
                Bereits gezahlte Beträge werden nur bei rechtmäßiger Kündigung durch den Nutzer anteilig für die nicht genutzte Laufzeit zurückerstattet. Eine Rückerstattung bei Verstößen gegen diese AGB ist ausgeschlossen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">7. Geistiges Eigentum</h2>
              <p className="text-sm">
                <strong>7.1 Rechte des Anbieters</strong><br />
                Alle Rechte an der Plattform, einschließlich Urheberrechte, Markenrechte und sonstige Schutzrechte, verbleiben beim Anbieter oder dessen Lizenzgebern. Die Plattform ist urheberrechtlich geschützt.
              </p>
              <p className="text-sm mt-2">
                <strong>7.2 Rechte des Nutzers an eigenen Inhalten</strong><br />
                Der Nutzer behält alle Rechte an den von ihm erstellten Bots, Bot-Konfigurationen, hochgeladenen Dokumenten und sonstigen Inhalten. Der Nutzer räumt dem Anbieter das Recht ein, diese Inhalte zum Zwecke der Bereitstellung der Plattform zu speichern und zu verarbeiten.
              </p>
              <p className="text-sm mt-2">
                <strong>7.3 Nutzung von KI-Modellen</strong><br />
                Die Plattform nutzt externe KI-Modelle (GROQ, OpenAI, Hugging Face). Die Nutzung dieser Modelle unterliegt den jeweiligen Nutzungsbedingungen der Anbieter. Der Nutzer ist dafür verantwortlich, die Inhalte seiner Bots auf Konformität mit diesen Bedingungen zu prüfen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">8. Datenschutz</h2>
              <p className="text-sm">
                Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten finden Sie in unserer <Link href={`${basePath}/legal/privacy`} className="text-brand-green hover:underline">Datenschutzerklärung</Link>.
              </p>
              <p className="text-sm mt-2">
                <strong>Hinweis für Bot-Betreiber:</strong> Als Betreiber von WhatsApp-Bots sind Sie selbst verantwortlich für die Einhaltung der Datenschutzbestimmungen (DSGVO) gegenüber Ihren Kunden. Sie müssen eine eigene Datenschutzerklärung bereitstellen und die entsprechenden Rechtsgrundlagen erfüllen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">9. Haftung</h2>
              <p className="text-sm">
                <strong>9.1 Haftungsbeschränkungen</strong><br />
                Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach Maßgabe des Produkthaftungsgesetzes. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung einer wesentlichen Vertragspflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht und auf deren Einhaltung der Vertragspartner regelmäßig vertrauen darf (Kardinalpflicht). Die Haftung ist in diesem Fall auf die bei Vertragsschluss vorhersehbaren, vertragstypischen Schäden begrenzt.
              </p>
              <p className="text-sm mt-2">
                <strong>9.2 Haftungsausschluss</strong><br />
                Die Haftung für Schäden, die nicht am Körper entstehen, ist ausgeschlossen, es sei denn, es handelt sich um Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit oder aus der Verletzung einer wesentlichen Vertragspflicht. Die Haftung für Schäden aus der Verletzung einer wesentlichen Vertragspflicht ist jedoch auf die bei Vertragsschluss vorhersehbaren, vertragstypischen Schäden begrenzt, sofern nicht Vorsatz oder grobe Fahrlässigkeit vorliegt.
              </p>
              <p className="text-sm mt-2">
                <strong>9.3 Haftung für Drittdienste</strong><br />
                Der Anbieter übernimmt keine Haftung für Ausfälle, Fehler oder Einschränkungen von Drittdiensten (BSPs, WhatsApp Business API, KI-Modelle, Supabase, etc.). Die Verfügbarkeit und Funktionalität dieser Dienste liegt außerhalb des Einflussbereichs des Anbieters.
              </p>
              <p className="text-sm mt-2">
                <strong>9.4 Datenverlust</strong><br />
                Der Anbieter empfiehlt dem Nutzer, regelmäßig Backups seiner Bot-Konfigurationen zu erstellen. Für Datenverlust haftet der Anbieter nur bei Vorsatz oder grober Fahrlässigkeit.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">10. Gewährleistung und Wartung</h2>
              <p className="text-sm">
                <strong>10.1 Gewährleistung</strong><br />
                Für Mängel der Plattform gelten die gesetzlichen Gewährleistungsrechte. Die Gewährleistungsfrist beträgt 12 Monate ab Lieferung der Leistung.
              </p>
              <p className="text-sm mt-2">
                <strong>10.2 Wartung und Updates</strong><br />
                Der Anbieter behält sich vor, die Plattform regelmäßig zu warten und zu aktualisieren. Geplante Wartungsarbeiten werden, soweit möglich, vorher angekündigt. Updates können zu vorübergehenden Einschränkungen der Verfügbarkeit führen.
              </p>
              <p className="text-sm mt-2">
                <strong>10.3 Support</strong><br />
                Der Umfang des Supports richtet sich nach dem gewählten Tarif. Support-Anfragen können per E-Mail an shop@owona.de gestellt werden.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">11. Kündigung</h2>
              <p className="text-sm">
                <strong>11.1 Kündigung durch den Nutzer</strong><br />
                Der Nutzer kann den Vertrag jederzeit mit einer Frist von 30 Tagen zum Ende einer Abrechnungsperiode kündigen. Die Kündigung erfolgt durch Nutzung der Kündigungsfunktion im Nutzerkonto oder per E-Mail an shop@owona.de.
              </p>
              <p className="text-sm mt-2">
                <strong>11.2 Kündigung durch den Anbieter</strong><br />
                Der Anbieter kann den Vertrag aus wichtigem Grund ohne Einhaltung einer Kündigungsfrist kündigen. Ein wichtiger Grund liegt insbesondere vor bei:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Verstößen gegen diese AGB</li>
                <li>Nichtzahlung trotz Mahnung</li>
                <li>Illegaler Nutzung der Plattform</li>
                <li>Verletzung von Rechten Dritter</li>
                <li>Verstoß gegen WhatsApp Business API Richtlinien</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>11.3 Folgen der Kündigung</strong><br />
                Nach Kündigung wird der Zugang zum Nutzerkonto gesperrt. Der Nutzer kann seine Daten innerhalb von 30 Tagen nach Kündigung exportieren. Danach werden die Daten gelöscht, sofern keine gesetzlichen Aufbewahrungsfristen bestehen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">12. Änderungen der AGB</h2>
              <p className="text-sm">
                Der Anbieter behält sich vor, diese AGB zu ändern, sofern dies erforderlich ist, um neue Entwicklungen oder Änderungen der Rechtslage zu berücksichtigen oder die Plattform zu verbessern. Änderungen werden dem Nutzer per E-Mail oder durch Anzeige auf der Plattform mitgeteilt. Widerspricht der Nutzer den geänderten AGB nicht innerhalb von 30 Tagen nach Mitteilung, gelten die geänderten AGB als genehmigt. Der Anbieter wird den Nutzer in der Mitteilung auf die Bedeutung dieser Frist und die Möglichkeit des Widerspruchs hinweisen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">13. Streitbeilegung und Verbraucherstreitbeilegung</h2>
              <p className="text-sm">
                <strong>13.1 Streitbeilegung</strong><br />
                Der Anbieter ist weder bereit noch verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
              <p className="text-sm mt-2">
                <strong>13.2 Online-Streitbeilegung</strong><br />
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit, die Sie unter <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">https://ec.europa.eu/consumers/odr/</a> finden. Wir sind nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">14. Schlussbestimmungen</h2>
              <p className="text-sm">
                <strong>14.1 Anwendbares Recht</strong><br />
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
              </p>
              <p className="text-sm mt-2">
                <strong>14.2 Gerichtsstand</strong><br />
                Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Sitz des Anbieters. Gleiches gilt, wenn der Nutzer keinen allgemeinen Gerichtsstand in Deutschland hat oder seinen Wohnsitz oder gewöhnlichen Aufenthalt nach Vertragsschluss aus dem Inland verlegt hat.
              </p>
              <p className="text-sm mt-2">
                <strong>14.3 Teilnichtigkeit</strong><br />
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, so bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. An die Stelle der unwirksamen Bestimmung soll diejenige wirksame Regelung treten, deren wirtschaftliches Ergebnis der unwirksamen Bestimmung am nächsten kommt.
              </p>
              <p className="text-sm mt-2">
                <strong>14.4 Schriftform</strong><br />
                Änderungen und Ergänzungen dieser AGB bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieser Schriftformklausel.
              </p>
              <p className="text-sm mt-2">
                <strong>14.5 Salvatorische Klausel</strong><br />
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, so bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. An die Stelle der unwirksamen Bestimmung soll diejenige wirksame Regelung treten, deren wirtschaftliches Ergebnis der unwirksamen Bestimmung am nächsten kommt.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mt-6 mb-3">15. Kontakt</h2>
              <p className="text-sm">
                Bei Fragen zu diesen AGB können Sie uns kontaktieren:<br />
                <strong>E-Mail:</strong> <a href="mailto:shop@owona.de" className="text-brand-green hover:underline">shop@owona.de</a><br />
                <strong>Telefon:</strong> +49 6203 9375214
              </p>
            </section>

            <p className="text-sm mt-6 pt-6 border-t border-gray-200">
              <strong>Stand: Januar 2025</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

