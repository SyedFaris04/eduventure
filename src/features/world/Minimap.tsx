import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseMap, type Cell } from '../../game/map'
import { GREENHAVEN } from '../../game/maps/greenhaven'
import { useGame } from '../../game/store'

const COLOURS: Record<string, string> = {
  grass: '#8bc34a',
  flowers: '#9ccc65',
  path: '#f2b872',
  sand: '#f5dca0',
  water: '#5ab4d8',
  bridge: '#b98252',
  tree: '#4f8a2f',
  bush: '#5e9c35',
  rock: '#9aa0a6',
  fence: '#8a5a3b',
  well: '#a3a8ae',
  house: '#d9534f',
}
const colourOf = (c: Cell) => COLOURS[c.prop ?? ''] ?? (c.blocks && !c.npc ? COLOURS.house : COLOURS[c.tile])

/** Small isometric overview: terrain drawn once, player and villagers on top. Tap to enlarge. */
export function Minimap() {
  const { t } = useTranslation()
  const map = useMemo(() => parseMap(GREENHAVEN), [])
  const ref = useRef<HTMLCanvasElement>(null)
  const base = useRef<HTMLCanvasElement | null>(null)
  const [big, setBig] = useState(false)
  const player = useGame((s) => s.player)
  const monsters = useGame((s) => s.monsters)
  const S = 3 // pixels per tile edge in the base drawing
  const W = (map.width + map.height) * S
  const H = ((map.width + map.height) * S) / 2

  // Isometric transform: grid (x, y) → canvas.
  const iso = (ctx: CanvasRenderingContext2D) => ctx.setTransform(S, S / 2, -S, S / 2, map.height * S, 0)

  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    iso(ctx)
    map.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        ctx.fillStyle = colourOf(cell)
        ctx.fillRect(x, y, 1.05, 1.05)
      }),
    )
    base.current = c
  }, [map, W, H])

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !base.current) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.drawImage(base.current, 0, 0)
    iso(ctx)
    const dot = (x: number, y: number, fill: string, r: number) => {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const px = (x - y) * S + map.height * S
      const py = ((x + y) * S) / 2
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#3b2a1e'
      ctx.stroke()
      ctx.restore()
    }
    for (const n of map.npcs) dot(n.x + 0.5, n.y + 0.5, '#4fa3c7', 3.5)
    for (const b of map.bosses) dot(b.x + 0.5, b.y + 0.5, '#7e5bb5', 5)
    for (const m of monsters) dot(m.x, m.y, '#e2574c', 3)
    dot(player.x, player.y, '#f7c843', 4.5)
  }, [player, monsters, map, W, H])

  return (
    <button
      type="button"
      onClick={() => setBig((b) => !b)}
      aria-label={t(big ? 'world.minimapShrink' : 'world.minimapEnlarge')}
      className="pointer-events-auto absolute end-3 top-30 z-10 rounded-2xl border-[3px] border-wood bg-[#5fb3d9]/90 p-1 shadow-[0_4px_0_var(--color-wood-dark)] md:top-auto md:bottom-3"
    >
      <canvas ref={ref} width={W} height={H} className={`block transition-[width] ${big ? 'w-[min(80vw,320px)]' : 'w-28 sm:w-40'}`} />
    </button>
  )
}
