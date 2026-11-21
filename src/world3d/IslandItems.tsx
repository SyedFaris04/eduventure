import { useMemo } from 'react'
import { ITEM, size, type Placed } from '../features/island/rules'
import { islandParts } from './props/islandProps'
import { PartInstances } from './Props'

/** Things built on My island, drawn in batches by kind (so even 400 items cost a few draw calls). */
export function IslandItems({ items, shadows }: { items: Placed[]; shadows: boolean }) {
  const groups = useMemo(() => {
    const byKind = new Map<string, { x: number; z: number; ry: number; s: number }[]>()
    for (const p of items) {
      const d = ITEM[p.item]
      if (!d) continue
      const { w, h } = size(d, p.rot)
      const list = byKind.get(p.item) ?? []
      list.push({ x: p.x + w / 2, z: p.y + h / 2, ry: (p.rot * Math.PI) / 2, s: 1 })
      byKind.set(p.item, list)
    }
    return [...byKind.entries()]
  }, [items])
  return (
    <group>
      {groups.map(([id, list]) =>
        islandParts(id).map((part, i) => <PartInstances key={`${id}-${i}-${list.length}`} part={part} items={list} shadows={shadows} />),
      )}
    </group>
  )
}
