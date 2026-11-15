import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

/** Native <dialog>: gives focus trapping, Escape-to-close and inert background for free. */
export function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(92vw,32rem)] rounded-3xl border-4 border-wood bg-cream p-0 text-ink shadow-[0_0_0_3px_var(--color-wood-dark),0_20px_40px_rgb(0_0_0/0.4)] backdrop:bg-ink/50"
    >
      <div className="flex items-center justify-between gap-4 bg-gradient-to-b from-wood to-wood-dark px-5 py-3 text-cream">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-white/15">
          <X />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
