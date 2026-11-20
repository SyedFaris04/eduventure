import { useMemo } from 'react'
import { Sparkles } from '@react-three/drei'
import type { GameMap } from '../game/map'
import type { FestivalKind } from '../features/festival/festivalRules'
import { PartInstances } from './Props'
import { festivalLayout } from './props/festivalProps'

/** Merdeka fireworks: coloured sparkle bursts high above the kampung (only on capable devices, never under reduced motion). */
function Fireworks({ map }: { map: GameMap }) {
  const bursts = [
    { at: [map.width * 0.3, 11, map.height * 0.35], color: '#d8352a' },
    { at: [map.width * 0.6, 12, map.height * 0.3], color: '#f2c14e' },
    { at: [map.width * 0.45, 10, map.height * 0.55], color: '#4f8fe0' },
    { at: [map.width * 0.7, 11, map.height * 0.6], color: '#ffffff' },
  ] as const
  return (
    <>
      {bursts.map((b) => (
        <Sparkles key={b.color} position={[...b.at]} count={40} scale={4} size={10} speed={0.8} color={b.color} />
      ))}
    </>
  )
}

/** The decorations of every festival that is on. Pieces never block movement: the map's walls are unchanged. */
export function FestivalDecor({ map, kinds, fancy, shadows }: { map: GameMap; kinds: FestivalKind[]; fancy: boolean; shadows: boolean }) {
  const pieces = useMemo(() => kinds.flatMap((k) => festivalLayout(map, k, fancy)), [map, kinds, fancy])
  if (!kinds.length) return null
  return (
    <>
      {pieces.map((p) => (
        <group key={p.key} name={`festival-${p.key}`}>
          {p.parts.map((part, i) => (
            <PartInstances key={`${i}-${p.items.length}`} part={part} items={p.items} shadows={shadows} />
          ))}
        </group>
      ))}
      {fancy && kinds.includes('merdeka') && <Fireworks map={map} />}
    </>
  )
}
