import { useMemo } from 'react'
import { CAMP_BUILDS, type GameMap } from '../game/map'
import { campParts, harvestParts, HARVEST_KINDS, type ModelPart } from './props/harvestProps'
import { hash, PartInstances } from './Props'

type Item = { x: number; z: number; ry: number; s: number }

function Batch({ parts, items, shadows }: { parts: ModelPart[]; items: Item[]; shadows: boolean }) {
  if (!items.length) return null
  // A new count needs a new instanced mesh, so the key carries it.
  return (
    <>
      {parts.map((p, i) => (
        <PartInstances key={`${i}-${items.length}`} part={p} items={items} shadows={shadows} />
      ))}
    </>
  )
}

/**
 * Harvest nodes (ready, or regrowing for this player), the camp workbench, and the camp builds this island has finished.
 * Drawn in batches, so even a big island costs only a few draw calls.
 */
export function HarvestNodes({ map, regrowing, built, shadows }: { map: GameMap; regrowing: Set<string>; built: Set<string>; shadows: boolean }) {
  const groups = useMemo(() => {
    const out: { key: string; parts: ModelPart[]; items: Item[] }[] = []
    const place = (x: number, y: number, spin: boolean): Item => ({ x: x + 0.5, z: y + 0.5, ry: spin ? hash(x, y) * 6.283 : 0, s: spin ? 0.9 + hash(x, y, 1) * 0.2 : 1 })
    for (const kind of HARVEST_KINDS) {
      const nodes = map.props.filter((p) => p.kind === kind)
      for (const ready of [true, false]) {
        const items = nodes.filter((p) => regrowing.has(`${p.x},${p.y}`) !== ready).map((p) => place(p.x, p.y, true))
        out.push({ key: `${kind}-${ready}`, parts: harvestParts(kind, ready), items })
      }
    }
    for (const kind of ['workbench', ...CAMP_BUILDS] as const) {
      if (kind !== 'workbench' && !built.has(kind)) continue
      out.push({ key: kind, parts: campParts(kind), items: map.props.filter((p) => p.kind === kind).map((p) => place(p.x, p.y, false)) })
    }
    return out
  }, [map, regrowing, built])
  return (
    <group>
      {groups.map((g) => (
        <Batch key={g.key} parts={g.parts} items={g.items} shadows={shadows} />
      ))}
    </group>
  )
}
