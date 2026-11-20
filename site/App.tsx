import { Download, Gamepad2, Languages } from 'lucide-react'
import { buttonClasses } from '../src/components/ui/Button'
import { useLang } from './lang'
import { APK_URL, PLAY_URL } from './links'
import { Hero3D } from './Hero3D'
import { HowItWorks } from './sections/HowItWorks'
import { TryQuestion } from './sections/TryQuestion'
import { MeetPet } from './sections/MeetPet'
import { Islands } from './sections/Islands'
import { Safety } from './sections/Safety'
import { DownloadSection } from './sections/Download'
import type { COPY } from './copy'

export type SiteCopy = (typeof COPY)['en']

/** The Eduventure website: one page that shows the game and hands out the Android app. */
export function App() {
  const [lang, setLang, t] = useLang()
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#8ed1ff] via-[#c9ecff] to-cream text-ink">
      <header className="sticky top-0 z-20 border-b-4 border-wood/30 bg-[#8ed1ff]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <a href="#top" className="title-outline me-auto bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text font-display text-xl font-bold text-transparent sm:text-3xl">
            EDUVENTURE
          </a>
          <button type="button" onClick={() => setLang(lang === 'en' ? 'ms' : 'en')} className={buttonClasses('secondary', 'md', 'px-3!')} lang={lang === 'en' ? 'ms' : 'en'}>
            <Languages size={18} aria-hidden /> <span className="hidden sm:inline">{t.nav.switchTo}</span>
            <span className="sm:hidden">{lang === 'en' ? 'BM' : 'EN'}</span>
          </button>
          <a href={PLAY_URL} className={buttonClasses('primary', 'md', 'px-3! whitespace-nowrap sm:px-5!')}>
            <Gamepad2 size={18} aria-hidden className="hidden sm:block" /> <span className="hidden sm:inline">{t.nav.play}</span>
            <span className="sm:hidden">{t.nav.playShort}</span>
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-6 pb-12 md:grid-cols-2 md:pt-12">
          <div className="order-2 flex flex-col items-center text-center md:order-1 md:items-start md:text-start">
            <h1 className="title-outline bg-gradient-to-b from-[#fff1a8] via-gold to-[#ef9b2f] bg-clip-text font-display text-[clamp(2.6rem,9vw,4.5rem)] leading-none font-bold text-transparent">
              EDUVENTURE
            </h1>
            <p className="mt-4 -rotate-1 rounded-xl border-[3px] border-wood bg-cream px-4 py-1.5 font-display text-lg font-semibold text-wood-dark shadow-[0_3px_0_var(--color-wood)] sm:text-xl">
              {t.hero.tagline}
            </p>
            <p className="mt-4 max-w-md text-lg font-semibold text-wood-dark">{t.hero.lead}</p>
            <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={APK_URL} className={buttonClasses('primary', 'lg', 'flex-1 sm:whitespace-nowrap')}>
                <Download aria-hidden /> {t.hero.download}
              </a>
              <a href={PLAY_URL} className={buttonClasses('secondary', 'lg', 'flex-1 sm:whitespace-nowrap text-lg!')}>
                <Gamepad2 aria-hidden /> {t.hero.play}
              </a>
            </div>
            <p className="mt-3 text-sm font-bold text-grass-dark">{t.hero.free}</p>
          </div>
          <div className="order-1 md:order-2">
            <Hero3D hint={t.hero.drag} />
          </div>
        </section>

        <HowItWorks t={t} />
        <TryQuestion t={t} lang={lang} />
        <MeetPet t={t} />
        <Islands t={t} />
        <Safety t={t} />
        <DownloadSection t={t} />
      </main>

      <footer className="border-t-4 border-wood/30 bg-wood-dark px-4 py-8 text-center text-cream">
        <p className="font-display text-xl font-bold">EDUVENTURE</p>
        <p className="mt-1 text-sm">{t.footer.made}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm font-bold underline">
          <a href={PLAY_URL}>{t.footer.play}</a>
          <a href={APK_URL}>{t.footer.download}</a>
        </div>
      </footer>
    </div>
  )
}
