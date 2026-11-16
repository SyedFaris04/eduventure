import { useEffect, useState } from 'react'
import { aspect, snapshotKey, type Subject } from './snapshotKey'

/** A still picture of a 3D hero or monster. three.js loads on first use, so pages without pictures never pay for it. */
export function useSnapshot(subject: Subject, px: number): string | undefined {
  const key = `${snapshotKey(subject)}@${px}`
  const [url, setUrl] = useState<{ key: string; url: string }>()
  useEffect(() => {
    let live = true
    import('./snapshot')
      .then((m) => m.snapshot(subject, px))
      .then((u) => live && setUrl({ key, url: u }))
      .catch(() => undefined) // no WebGL: the picture stays an empty box
    return () => {
      live = false
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return url?.key === key ? url.url : undefined
}

type Props = { subject: Subject; px: number; alt: string; className?: string }

/** Same size while it draws, so nothing jumps; labelled like the image it becomes. */
export function Snapshot({ subject, px, alt, className = '' }: Props) {
  const url = useSnapshot(subject, px)
  const style = { aspectRatio: `1 / ${aspect(subject)}` }
  if (url) return <img src={url} alt={alt} className={className} style={style} />
  return <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={`inline-block ${className}`} style={style} />
}
