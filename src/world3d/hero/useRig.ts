import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { AnimationClip, Object3D } from 'three'

export const RIG_URL = '/assets/models/rig.glb'

/** A fresh copy of the KayKit skeleton per hero (it has no skinned meshes, so a plain deep clone is enough) plus the shared clips. */
export function useRig(): { rig: Object3D; clips: AnimationClip[] } {
  const gltf = useGLTF(RIG_URL)
  const rig = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  return { rig, clips: gltf.animations }
}

export const preloadRig = () => useGLTF.preload(RIG_URL)
