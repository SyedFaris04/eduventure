import { useMemo } from 'react'
import { MeshBasicMaterial } from 'three'
import { useGame } from '../game/store'
import { blocksHero, centredAt, fits, ITEM, size, type Placed } from '../features/island/rules'
import { islandParts } from './props/islandProps'

const TINT = {
  ok: new MeshBasicMaterial({ color: '#5bd16a', transparent: true, opacity: 0.55, depthWrite: false }),
  no: new MeshBasicMaterial({ color: '#ff5a4f', transparent: true, opacity: 0.55, depthWrite: false }),
}

/** While building: the chosen (or picked-up) item where it would go, green if it fits and red if not. */
export function BuildGhost({ items }: { items: Placed[] }) {
  const build = useGame((s) => s.build)
  const hover = useGame((s) => s.buildHover)
  const tap = useGame((s) => s.buildTap)
  const moving = build.mode === 'move' && build.moving !== null ? items.find((p) => p.id === build.moving) : undefined
  const id = moving?.item ?? (build.mode === 'place' ? build.item : null)
  const tile = hover ?? tap
  const parts = useMemo(() => (id ? islandParts(id) : []), [id])
  if (!build.open || !id || !tile || !ITEM[id]) return null
  const d = ITEM[id]
  const at = centredAt(d, tile.x, tile.y, build.rot)
  const ok = fits(items, id, at.x, at.y, build.rot, moving?.id) && !blocksHero(id, at.x, at.y, build.rot, useGame.getState().player)
  const { w, h } = size(d, build.rot)
  return (
    <group position={[at.x + w / 2, 0.02, at.y + h / 2]} rotation={[0, (build.rot * Math.PI) / 2, 0]}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={ok ? TINT.ok : TINT.no} matrixAutoUpdate={false} matrix={p.local} />
      ))}
    </group>
  )
}
