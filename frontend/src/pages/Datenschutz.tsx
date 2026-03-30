import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Datenschutz() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-1 pb-24 max-w-lg mx-auto w-full">
      {/* Header */}
      <div
        className="px-5 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-teal-600 font-medium mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t('common.back', 'Zurück')}
        </button>
        <h1 className="text-2xl font-bold text-stone-900">Datenschutzerklärung</h1>
        <p className="text-xs text-stone-400 mt-1">Gemäß DSGVO / GDPR</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Verantwortlicher */}
        <Section title="1. Verantwortlicher">
          <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO):</p>
          <div className="mt-2 space-y-0.5">
            <p className="font-medium text-stone-800">e-findo IT Solutions GmbH</p>
            <p>Talstraße 23, 78234 Engen, Deutschland</p>
            <p>Telefon: 07733 9968950</p>
            <p>
              E-Mail:{' '}
              <a href="mailto:info@e-findo.de" className="text-teal-600 hover:underline">
                info@e-findo.de
              </a>
            </p>
            <p>Geschäftsführer: Armin Maier</p>
          </div>
        </Section>

        {/* Übersicht */}
        <Section title="2. Übersicht der Datenverarbeitungen">
          <p>
            CleanCheck ist eine App zur Bewertung der Sauberkeit von Restaurants und
            Sanitäreinrichtungen. Im Folgenden informieren wir Sie über die Verarbeitung
            personenbezogener Daten bei der Nutzung unserer App.
          </p>
        </Section>

        {/* Datenerhebung */}
        <Section title="3. Erhobene Daten">
          <h3 className="font-medium text-stone-800 mb-1">a) Registrierung und Nutzerkonto</h3>
          <p className="mb-3">
            Bei der Registrierung erheben wir Ihren gewählten Nutzernamen und Ihre E-Mail-Adresse.
            Diese Daten werden zur Bereitstellung Ihres Nutzerkontos und zur Zuordnung Ihrer
            Bewertungen verarbeitet (Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung).
          </p>

          <h3 className="font-medium text-stone-800 mb-1">b) Bewertungen</h3>
          <p className="mb-3">
            Wenn Sie eine Bewertung abgeben, speichern wir die Bewertungsdaten (Scores, Kommentare)
            zusammen mit Ihrer Nutzer-ID und dem Zeitpunkt. Bewertungen sind unter Ihrem Nutzernamen
            öffentlich sichtbar.
          </p>

          <h3 className="font-medium text-stone-800 mb-1">c) Standortdaten (Geolocation)</h3>
          <p className="mb-3">
            Mit Ihrer ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) nutzen wir Ihren
            Standort, um Ihnen Restaurants in der Nähe anzuzeigen. Die Standortdaten werden
            ausschließlich zur Entfernungsberechnung verwendet und nicht dauerhaft gespeichert. Sie
            können die Standortfreigabe jederzeit in Ihren Geräteeinstellungen widerrufen.
          </p>

          <h3 className="font-medium text-stone-800 mb-1">d) Fotos</h3>
          <p>
            Wenn Sie Fotos zu Bewertungen hochladen, werden diese auf Servern von Cloudflare R2
            (Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA) gespeichert. Cloudflare
            R2 nutzt das europäische Netzwerk von Cloudflare. Die Rechtsgrundlage ist Art. 6 Abs. 1
            lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
            an zuverlässiger Bildspeicherung).
          </p>
        </Section>

        {/* Google APIs */}
        <Section title="4. Google Maps & Places API">
          <p className="mb-2">
            Wir nutzen die Google Maps API und Google Places API (Google Ireland Limited, Gordon House,
            Barrow Street, Dublin 4, Irland), um Restaurantdaten (Name, Adresse, Kategorie) abzurufen
            und die Kartenansicht bereitzustellen.
          </p>
          <p className="mb-2">
            Dabei kann Ihre IP-Adresse an Google übermittelt werden. Google verarbeitet diese Daten
            gemäß der{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              Google Datenschutzerklärung
            </a>
            .
          </p>
          <p>
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
            Bereitstellung einer funktionsfähigen Kartenansicht und aktueller Restaurantdaten).
          </p>
        </Section>

        {/* Cookies */}
        <Section title="5. Cookies und lokale Speicherung">
          <p>
            CleanCheck verwendet keine Tracking-Cookies. Wir nutzen ausschließlich den lokalen
            Speicher (localStorage) Ihres Browsers, um Einstellungen (Sprache, Onboarding-Status) und
            Ihr Authentifizierungs-Token zu speichern. Diese Daten werden nicht an Dritte übermittelt.
          </p>
        </Section>

        {/* Analytics */}
        <Section title="6. Analyse und Tracking">
          <p>
            Wir setzen derzeit <strong>keine</strong> Analyse- oder Tracking-Tools (wie Google
            Analytics, Matomo o.ä.) ein. Es findet keine Auswertung Ihres Nutzungsverhaltens statt.
          </p>
        </Section>

        {/* Hosting */}
        <Section title="7. Hosting">
          <p>
            Das Backend unserer App wird auf Railway (Railway Corporation, San Francisco, CA, USA)
            gehostet. Die Datenübertragung erfolgt verschlüsselt über HTTPS. Es können
            Server-Logdaten (IP-Adresse, Zeitpunkt, Anfrage) kurzzeitig gespeichert werden.
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </Section>

        {/* Rechte */}
        <Section title="8. Ihre Rechte">
          <p className="mb-2">Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
          <ul className="list-disc list-inside space-y-1.5 mb-3">
            <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir über Sie speichern</li>
            <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten</li>
            <li><strong>Löschung</strong> (Art. 17 DSGVO) — Löschung Ihrer Daten</li>
            <li><strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Export Ihrer Daten</li>
            <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen die Verarbeitung</li>
          </ul>
          <p className="mb-2">
            Sie können Ihre Daten jederzeit über die Datenexport-Funktion in der App herunterladen
            oder Ihr Konto löschen (Profil → Konto löschen).
          </p>
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die
            zuständige Aufsichtsbehörde ist der Landesbeauftragte für den Datenschutz und die
            Informationsfreiheit Baden-Württemberg.
          </p>
        </Section>

        {/* Datensicherheit */}
        <Section title="9. Datensicherheit">
          <p>
            Wir verwenden SSL/TLS-Verschlüsselung für die gesamte Datenübertragung. Passwörter werden
            ausschließlich als kryptographische Hashes gespeichert. Der Zugriff auf personenbezogene
            Daten ist auf autorisierte Personen beschränkt.
          </p>
        </Section>

        {/* Änderungen */}
        <Section title="10. Änderungen dieser Datenschutzerklärung">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
            Rechtslagen oder Änderungen der App anzupassen. Die aktuelle Version finden Sie stets in
            der App.
          </p>
        </Section>

        {/* Kontakt */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5 mb-2">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Kontakt für Datenschutzfragen</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p>e-findo IT Solutions GmbH</p>
            <p>
              E-Mail:{' '}
              <a href="mailto:info@e-findo.de" className="text-teal-600 hover:underline">
                info@e-findo.de
              </a>
            </p>
            <p>Telefon: 07733 9968950</p>
          </div>
        </section>

        <p className="text-xs text-stone-400 text-center pb-4">Stand: März 2026</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
      <h2 className="text-sm font-semibold text-stone-800 mb-3">{title}</h2>
      <div className="text-sm text-stone-600 leading-relaxed">{children}</div>
    </section>
  );
}
