import { CheckCircle2, Download, FileDown, Gamepad2, ShieldQuestion, Smartphone } from 'lucide-react'
import { buttonClasses } from '../../src/components/ui/Button'
import type { SiteCopy } from '../App'
import { APK_URL, PLAY_URL } from '../links'
import { card, Section } from './Section'

const STEPS = [
  { key: 'one', Icon: Download },
  { key: 'two', Icon: FileDown },
  { key: 'three', Icon: ShieldQuestion },
  { key: 'four', Icon: CheckCircle2 },
] as const

/** The Android app: one big button, four install steps, and a QR code for people reading on a laptop. */
export function DownloadSection({ t }: { t: SiteCopy }) {
  return (
    <Section id="download" title={t.download.title} lead={t.download.lead} tint="bg-gold/20">
      <div className={`${card} mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-[1.5fr_1fr]`}>
        <div className="flex flex-col gap-4">
          <a href={APK_URL} className={buttonClasses('primary', 'lg', 'w-full')}>
            <Smartphone aria-hidden /> {t.download.button}
          </a>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map(({ key, Icon }, i) => (
              <li key={key} className="flex items-start gap-3 rounded-2xl border-2 border-wood/30 bg-white p-3">
                <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-water/40 text-water-dark">
                  <Icon aria-hidden />
                  <span className="absolute -top-2 -start-2 grid size-6 place-items-center rounded-full bg-wood-dark text-xs font-bold text-cream">{i + 1}</span>
                </span>
                <span className="font-semibold">{t.download.steps[key]}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm">{t.download.updates}</p>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Gamepad2 size={18} aria-hidden /> <a href={PLAY_URL} className="underline">{t.download.iphone}</a>
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <img src={`${import.meta.env.BASE_URL}apk-qr.svg`} alt={t.download.qrAlt} width={200} height={200} className="rounded-2xl border-4 border-wood bg-white p-2" />
          <p className="max-w-56 text-sm font-semibold">{t.download.qr}</p>
        </div>
      </div>
    </Section>
  )
}
