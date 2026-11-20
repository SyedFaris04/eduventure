import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Smile } from 'lucide-react'
import { EMOTE_ICON, EMOTES, useRoom, type Emote } from './useRoom'

/** Emotes only, no typing: a button that opens six emotes. Hidden when a parent turned emotes off. */
export function EmoteBar({ onEmote }: { onEmote: (e: Emote) => void }) {
  const { t } = useTranslation()
  const can = useRoom((s) => s.canEmote && s.visible && s.status === 'online')
  const [open, setOpen] = useState(false)
  if (!can) return null
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <button type="button" aria-label={t('multiplayer.emotes')} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-12 place-items-center rounded-full border-2 border-wood bg-cream text-wood-dark shadow">
        <Smile aria-hidden />
      </button>
      {open && (
        <ul className="grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-wood bg-cream/95 p-2">
          {EMOTES.map((e) => (
            <li key={e}>
              <button
                type="button"
                aria-label={t(`multiplayer.emote.${e}`)}
                title={t(`multiplayer.emote.${e}`)}
                onClick={() => {
                  onEmote(e)
                  setOpen(false)
                }}
                className="grid size-11 place-items-center rounded-xl bg-white text-2xl"
              >
                {EMOTE_ICON[e]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
