import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Select } from '../../components/ui'
import type { BoardRights, NoteDraft } from './boardApi'
import { bodyProblem, MAX_BODY, PHRASES, STICKER_ICON, STICKERS, type StickerKey } from './boardRules'

/** Pick a sticker and a ready-made phrase; players 13 and over may also type. The server checks everything again. */
export function NoteComposer({ rights, busy, onPost }: { rights: BoardRights; busy: boolean; onPost: (note: NoteDraft) => void }) {
  const { t } = useTranslation()
  const [sticker, setSticker] = useState<StickerKey | null>(null)
  const [phrase, setPhrase] = useState('')
  const [body, setBody] = useState('')
  const textId = useId()

  if (!rights.can_write) {
    return <p className="rounded-xl border-2 border-wood/40 bg-white/60 p-2 text-sm font-semibold">{t(`board.reason.${rights.reason ?? 'banned'}`)}</p>
  }

  const text = rights.can_type ? body.trim() : ''
  const problem = rights.can_type ? bodyProblem(body) : null
  const ready = Boolean(sticker || phrase || text) && !problem

  function pin() {
    onPost({ ...(sticker && { sticker }), ...(phrase && { phrase }), ...(text && { body: text }) })
    setSticker(null)
    setPhrase('')
    setBody('')
  }

  return (
    <div className="space-y-2">
      <p className="font-display font-bold">{t('board.write')}</p>
      <div role="group" aria-label={t('board.stickerLabel')} className="flex flex-wrap gap-1">
        {STICKERS.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={t(`board.sticker.${s}`)}
            aria-pressed={sticker === s}
            onClick={() => setSticker(sticker === s ? null : s)}
            className={`grid size-10 place-items-center rounded-xl border-2 text-xl ${sticker === s ? 'border-wood-dark bg-gold' : 'border-wood/30 bg-white/70'}`}
          >
            <span aria-hidden>{STICKER_ICON[s]}</span>
          </button>
        ))}
      </div>
      <Select label={t('board.phraseLabel')} value={phrase} onChange={(e) => setPhrase(e.target.value)}>
        <option value="">{t('board.noPhrase')}</option>
        {PHRASES.map((p) => (
          <option key={p} value={p}>
            {t(`board.phrase.${p}`)}
          </option>
        ))}
      </Select>
      {rights.can_type && (
        <div className="flex flex-col gap-1">
          <label htmlFor={textId} className="font-display font-medium">{t('board.textLabel')}</label>
          <input
            id={textId}
            value={body}
            maxLength={MAX_BODY}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-11 rounded-xl border-[3px] border-wood/60 bg-white px-3 text-base"
          />
          <span className="text-xs font-semibold text-wood-dark">{t('board.left', { n: MAX_BODY - body.length })}</span>
        </div>
      )}
      {problem && <p role="alert" className="text-sm font-semibold text-danger">{t(`board.error.${problem}`)}</p>}
      <Button disabled={!ready || busy} onClick={pin}>
        {t('board.pin')}
      </Button>
    </div>
  )
}
