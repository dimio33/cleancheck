import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Impressum() {
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
        <h1 className="text-2xl font-bold text-stone-900">Impressum</h1>
        <p className="text-xs text-stone-400 mt-1">Angaben gemäß § 5 TMG</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Company */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Anbieter</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p className="font-medium text-stone-800">e-findo IT Solutions GmbH</p>
            <p>Talstraße 23</p>
            <p>78234 Engen</p>
            <p>Deutschland</p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Kontakt</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p>Telefon: 07733 9968950</p>
            <p>
              E-Mail:{' '}
              <a href="mailto:info@e-findo.de" className="text-teal-600 hover:underline">
                info@e-findo.de
              </a>
            </p>
            <p>
              Website:{' '}
              <a href="https://e-findo.de" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                https://e-findo.de
              </a>
            </p>
          </div>
        </section>

        {/* Represented by */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Vertreten durch</h2>
          <p className="text-sm text-stone-600">Geschäftsführer: Armin Maier</p>
        </section>

        {/* Registration */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Registereintrag</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p>Registergericht: Amtsgericht Freiburg i.Br.</p>
            <p>Registernummer: HRB XXXXX</p>
          </div>
        </section>

        {/* Tax ID */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Umsatzsteuer-ID</h2>
          <div className="text-sm text-stone-600 space-y-1">
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:</p>
            <p>DE XXXXXXXXX</p>
          </div>
        </section>

        {/* Liability for content */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Haftung für Inhalte</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen.
          </p>
        </section>

        {/* Liability for links */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Haftung für Links</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
            übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
            Betreiber der Seiten verantwortlich.
          </p>
        </section>

        {/* Copyright */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Urheberrecht</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
            dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
            der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
            Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </section>

        {/* Dispute resolution */}
        <section className="bg-white rounded-2xl shadow-sm shadow-stone-200/50 p-5 mb-2">
          <h2 className="text-sm font-semibold text-stone-800 mb-3">Streitschlichtung</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline break-all"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
}
