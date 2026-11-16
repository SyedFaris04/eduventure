import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { AnimationMixer, LoopOnce, type AnimationAction } from 'three'
import type { Appearance } from '../../features/character/appearance'
import { buildHero } from './buildHero'
import { CLIP, CROSSFADE_S, pickLoop, type HeroAction, type LoopAction } from './animation'
import { useRig } from './useRig'

export type OneShot = { action: Exclude<HeroAction, LoopAction>; seq: number }

type Props = Omit<ThreeElements['group'], 'ref'> & {
  appearance: Appearance
  /** 0..1 movement speed, read every frame (a ref, so moving never re-renders React). */
  speed?: RefObject<number>
  oneShot?: OneShot | null
  onOneShotEnd?: () => void
  reducedMotion?: boolean
}

/** The one 3D hero: the KayKit rig dressed by `buildHero`, blending idle, walk and run, with one-shot reactions. */
export function HeroModel({ appearance, speed, oneShot, onOneShotEnd, reducedMotion = false, ...group }: Props) {
  const { rig, clips } = useRig()
  const look = JSON.stringify(appearance)

  useEffect(() => {
    const h = buildHero(JSON.parse(look) as Appearance, rig)
    return h.dispose
  }, [look, rig])

  const mixer = useMemo(() => new AnimationMixer(rig), [rig])
  const actions = useMemo(() => {
    const byName = new Map(clips.map((c) => [c.name, c]))
    return Object.fromEntries(Object.entries(CLIP).map(([a, name]) => [a, mixer.clipAction(byName.get(name)!)])) as Record<HeroAction, AnimationAction>
  }, [clips, mixer])
  const loop = useRef<LoopAction | null>(null)
  const playingOneShot = useRef(false)
  const endCb = useRef(onOneShotEnd)
  endCb.current = onOneShotEnd

  // Only stop (not uncache): React's development double-mount reuses the same actions after this cleanup.
  useEffect(() => () => void mixer.stopAllAction(), [mixer])

  // One-shots (cheer, hit, wave, attack) play once over the loop, then hand back to it.
  useEffect(() => {
    if (!oneShot) return
    const a = actions[oneShot.action]
    const from = loop.current ? actions[loop.current] : null
    a.reset().setLoop(LoopOnce, 1)
    a.clampWhenFinished = true
    if (reducedMotion) {
      a.play()
      a.time = a.getClip().duration
    } else if (from) a.crossFadeFrom(from, CROSSFADE_S, false).play()
    else a.play()
    playingOneShot.current = true
    const done = (e: { action: AnimationAction }) => {
      if (e.action !== a) return
      playingOneShot.current = false
      const back = actions[loop.current ?? 'idle']
      back.reset().play()
      a.crossFadeTo(back, reducedMotion ? 0 : CROSSFADE_S, false)
      endCb.current?.()
    }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }, [oneShot?.seq]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const s = speed?.current ?? 0
    const next = pickLoop(s)
    if (next !== loop.current && !playingOneShot.current) {
      const prev = loop.current ? actions[loop.current] : null
      const a = actions[next].reset().play()
      if (prev) prev.crossFadeTo(a, reducedMotion ? 0 : CROSSFADE_S, true)
      loop.current = next
    }
    // Feet keep pace with the ground: walk and run speed up with movement; the idle breath holds still under reduced motion.
    if (next === 'walk') actions.walk.timeScale = 0.6 + s
    if (next === 'run') actions.run.timeScale = 0.75 + s * 0.35
    actions.idle.timeScale = reducedMotion ? 0 : 1
    mixer.update(Math.min(dt, 0.1))
  })

  return <primitive object={rig} {...group} />
}
