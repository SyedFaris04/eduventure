import { useAudioSettings } from '../../audio/settings'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, RotateCw, Settings, Undo2, X } from 'lucide-react'
import { Button } from '../../components/ui'
import { useCamera } from '../../world3d/cameraStore'
import { PRESETS, type PresetId } from '../../world3d/projection'
import { useQuality } from '../../world3d/qualityStore'
import type { QualityChoice } from '../../world3d/quality'
import { VisibilitySetting } from '../multiplayer/VisibilitySetting'

const PRESET_IDS = Object.keys(PRESETS) as PresetId[]
const QUALITIES: QualityChoice[] = ['auto', 'high', 'low']

function Slider({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      <span className="flex justify-between">
        {label} <span className="text-wood-dark/70">{Math.round(value)}</span>
      </span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-grass-dark" />
    </label>
  )
}

/** World settings: graphics quality and the player's camera (saved on this device). */
export function WorldSettings({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const cam = useCamera()
  const quality = useQuality()
  const sound = useAudioSettings()
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  const active = PRESET_IDS.find((id) => PRESETS[id].tilt === cam.tilt && PRESETS[id].distance === cam.distance)

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3">
      <section role="dialog" aria-modal="true" aria-label={t('settings.title')} className="relative flex w-full max-w-md flex-col gap-4 rounded-3xl border-4 border-wood bg-cream p-4 shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)]">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute end-3 top-3 rounded-lg p-1 hover:bg-wood/10">
          <X aria-hidden />
        </button>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-wood-dark">
          <Settings aria-hidden /> {t('settings.title')}
        </h2>

        <div className="flex flex-col gap-2">
          <p className="font-display font-semibold">{t('settings.camera')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_IDS.map((id) => (
              <Button key={id} variant={active === id ? 'primary' : 'secondary'} aria-pressed={active === id} onClick={() => cam.preset(id)}>
                {t(`settings.preset.${id}`)}
              </Button>
            ))}
          </div>
          <Slider label={t('settings.tilt')} value={cam.tilt} min={25} max={70} onChange={(tilt) => cam.set({ tilt })} />
          <Slider label={t('settings.zoom')} value={cam.distance} min={9} max={32} step={0.5} onChange={(distance) => cam.set({ distance })} />
          <Slider label={t('settings.fov')} value={cam.fov} min={25} max={50} onChange={(fov) => cam.set({ fov })} />
          <Slider label={t('settings.rotation')} value={cam.yaw} min={0} max={359} onChange={(yaw) => cam.set({ yaw })} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => cam.rotate(-45)} aria-label={t('settings.turnLeft')}>
              <RotateCcw size={16} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={() => cam.rotate(45)} aria-label={t('settings.turnRight')}>
              <RotateCw size={16} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={cam.reset} aria-label={t('settings.reset')} className="ms-auto">
              <Undo2 size={16} aria-hidden /> {t('settings.resetShort')}
            </Button>
          </div>
          <p className="text-xs text-wood-dark/80">{t('settings.hint')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="flex items-center justify-between font-display font-semibold">
            {t('settings.sound')}
            <Button variant={sound.muted ? 'secondary' : 'primary'} aria-pressed={!sound.muted} onClick={() => sound.set({ muted: !sound.muted })}>
              {sound.muted ? t('settings.soundOff') : t('settings.soundOn')}
            </Button>
          </p>
          <Slider label={t('settings.music')} value={Math.round(sound.music * 100)} min={0} max={100} onChange={(v) => sound.set({ music: v / 100 })} />
          <Slider label={t('settings.effects')} value={Math.round(sound.effects * 100)} min={0} max={100} onChange={(v) => sound.set({ effects: v / 100 })} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-display font-semibold">{t('settings.graphics')}</p>
          <div className="flex gap-2">
            {QUALITIES.map((q) => (
              <Button key={q} variant={quality.choice === q ? 'primary' : 'secondary'} aria-pressed={quality.choice === q} onClick={() => quality.setChoice(q)}>
                {t(`world.qualityLevel.${q}`)}
              </Button>
            ))}
          </div>
        </div>
        {import.meta.env.VITE_ROOMS_URL && <VisibilitySetting />}
      </section>
    </div>
  )
}
