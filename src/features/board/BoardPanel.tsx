import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, MoreHorizontal, X } from 'lucide-react'
import { useGame } from '../../game/store'
import { usePlace } from '../../game/placeStore'
import { useSession } from '../authentication/useSession'
import { blockPlayer, blocksKey } from '../multiplayer/multiplayerApi'
import { BoardError, boardKey, deleteMyNote, postNote, reportNote, useBoardRights, useIslandBoard, type BoardNote, type NoteDraft, type NoteReportReason } from './boardApi'
import { dailyQuestion, STICKER_ICON, type StickerKey } from './boardRules'
import { NoteComposer } from './NoteComposer'

const REPORT_REASONS: NoteReportReason[] = ['rude', 'personal_info', 'unkind', 'other']

/** The open camp board; `place` overrides the island (the /dev/board page uses the hidden QA board). */
export function BoardPanel({ place }: { place?: string }) {
  return useGame((s) => s.board) ? <Board place={place} /> : null
}

function ago(iso: string, lang: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  const fmt = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' })
  return mins < 60 ? fmt.format(-mins, 'minute') : mins < 1440 ? fmt.format(-Math.round(mins / 60), 'hour') : fmt.format(-Math.round(mins / 1440), 'day')
}

/** The island's camp board: today's question, the latest notes, and pinning a note of your own. */
function Board({ place: override }: { place?: string }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const uid = useSession().session?.user.id
  const island = usePlace((s) => s.place)
  const place = override ?? island
  const board = useIslandBoard(place, true).data
  const rights = useBoardRights(uid).data
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [menu, setMenu] = useState<{ id: number; reporting: boolean } | null>(null)
  const close = () => useGame.setState({ board: false })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function run(work: () => Promise<unknown>, done?: string) {
    setBusy(true)
    setMessage(null)
    setMenu(null)
    try {
      await work()
      if (done) setMessage({ ok: true, text: t(done) })
    } catch (e) {
      setMessage({ ok: false, text: t(e instanceof BoardError ? e.message : 'board.error.generic') })
    } finally {
      setBusy(false)
      void queryClient.invalidateQueries({ queryKey: boardKey(place) })
    }
  }

  const post = (note: NoteDraft) => run(() => postNote(place, note), 'board.pinned')
  const hide = (n: BoardNote) =>
    run(async () => {
      await blockPlayer(n.public_id)
      await queryClient.invalidateQueries({ queryKey: blocksKey(uid) })
    }, 'board.hiddenDone')

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-ink/45 p-3">
      <section role="dialog" aria-modal="true" aria-label={t('board.title')} className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border-4 border-wood bg-cream shadow-[0_0_0_3px_var(--color-wood-dark),0_16px_40px_rgb(0_0_0/0.4)]">
        <header className="flex items-center gap-3 rounded-t-[20px] bg-gradient-to-b from-[#d9b38c] to-wood p-3 text-cream">
          <ClipboardList size={28} aria-hidden />
          <h2 className="flex-1 font-display text-xl font-bold">{t('board.title')}</h2>
          <button type="button" aria-label={t('common.close')} onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-white/20">
            <X aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {board && !board.open ? (
            <p className="rounded-xl border-2 border-wood/40 bg-white/60 p-3 font-semibold">{t('board.closed')}</p>
          ) : (
            <>
              <div className="rounded-2xl border-2 border-gold bg-gold/20 p-3">
                <p className="text-xs font-bold uppercase text-wood-dark">{t('board.today')}</p>
                <p className="font-display text-lg font-bold">{t(`board.q.${dailyQuestion(new Date())}`)}</p>
              </div>
              {/* Above the notes: the newest note (yours, after pinning) shows at the top, right under it. */}
              {rights && <NoteComposer rights={rights} busy={busy} onPost={post} />}
              {message && (
                <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl border-2 p-2 text-sm font-semibold ${message.ok ? 'border-grass-dark bg-grass/20' : 'border-danger bg-danger/10'}`}>
                  {message.text}
                </p>
              )}
              <ul className="space-y-2">
                {board?.notes.length === 0 && <li className="text-sm font-semibold text-wood-dark">{t('board.empty')}</li>}
                {board?.notes.map((n) => (
                  <li key={n.id} className="relative flex gap-2 rounded-2xl border-2 border-wood/30 bg-[#fff8d6] p-2 shadow-sm">
                    {n.sticker && <span aria-label={t(`board.sticker.${n.sticker}`)} role="img" className="text-2xl">{STICKER_ICON[n.sticker as StickerKey]}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-wood-dark">
                        <span>{n.mine ? t('board.you') : (n.name ?? t('multiplayer.player'))}</span> · {ago(n.created_at, i18n.language)}
                      </p>
                      {n.phrase && <p className="font-semibold">{t(`board.phrase.${n.phrase}`)}</p>}
                      {n.body && <p className="break-words">{n.body}</p>}
                    </div>
                    <button type="button" aria-label={t('board.noteMenu')} aria-expanded={menu?.id === n.id} onClick={() => setMenu(menu?.id === n.id ? null : { id: n.id, reporting: false })} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-wood/10">
                      <MoreHorizontal aria-hidden />
                    </button>
                    {menu?.id === n.id && (
                      <div className="absolute end-2 top-12 z-10 flex flex-col gap-1 rounded-xl border-2 border-wood bg-cream p-2 shadow-lg">
                        {n.mine ? (
                          <MenuButton onClick={() => run(() => deleteMyNote(n.id))} label={t('board.delete')} />
                        ) : menu.reporting ? (
                          <>
                            <p className="text-xs font-bold">{t('board.reportAs')}</p>
                            {REPORT_REASONS.map((r) => (
                              <MenuButton key={r} onClick={() => run(() => reportNote(n.id, r), 'board.reported')} label={t(`board.reportReason.${r}`)} />
                            ))}
                          </>
                        ) : (
                          <>
                            <MenuButton onClick={() => setMenu({ id: n.id, reporting: true })} label={t('board.report')} />
                            <MenuButton onClick={() => hide(n)} label={t('board.hide')} />
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-lg px-3 text-start font-semibold hover:bg-gold/40">
      {label}
    </button>
  )
}
