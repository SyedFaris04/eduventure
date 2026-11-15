import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import type { Group } from 'three'

// Palette tokens (CSS variables are not readable by WebGL materials).
const C = { grass: '#8bc34a', grassDark: '#5e8c31', rock: '#a98466', rockDark: '#7d5c43', path: '#f2b872', cream: '#fff6e3', water: '#9ed8f0', wood: '#8a5a3b', gold: '#f7c843', red: '#d9534f', ink: '#2e2a3a' }

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.4, 6]} />
        <meshToonMaterial color={C.wood} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.42, 0.85, 7]} />
        <meshToonMaterial color={C.grassDark} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <coneGeometry args={[0.3, 0.6, 7]} />
        <meshToonMaterial color="#6fa83d" />
      </mesh>
    </group>
  )
}

function Island() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[2, 1.95, 0.28, 10]} />
        <meshToonMaterial color={C.grass} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.98, 1.85, 0.2, 10]} />
        <meshToonMaterial color={C.grassDark} />
      </mesh>
      <mesh position={[0, -1.25, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.85, 2, 10]} />
        <meshToonMaterial color={C.rock} />
      </mesh>
      <mesh position={[0.5, -1.4, 0.4]} rotation={[Math.PI, 0.4, 0]}>
        <coneGeometry args={[0.6, 1.1, 6]} />
        <meshToonMaterial color={C.rockDark} />
      </mesh>
      <mesh position={[0.25, 0.15, 0.3]} rotation={[0, 0.7, 0]}>
        <boxGeometry args={[0.45, 0.03, 2.6]} />
        <meshToonMaterial color={C.path} />
      </mesh>
      <mesh position={[1.05, 0.15, 0.55]}>
        <cylinderGeometry args={[0.38, 0.38, 0.03, 18]} />
        <meshToonMaterial color={C.water} />
      </mesh>
      {/* cottage */}
      <group position={[-0.55, 0.14, -0.55]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.7, 0.54, 0.6]} />
          <meshToonMaterial color={C.cream} />
        </mesh>
        <mesh position={[0, 0.74, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.6, 0.45, 4]} />
          <meshToonMaterial color={C.red} />
        </mesh>
        <mesh position={[0, 0.17, 0.31]}>
          <boxGeometry args={[0.18, 0.32, 0.02]} />
          <meshToonMaterial color={C.wood} />
        </mesh>
      </group>
      <Tree position={[-1.35, 0.14, 0.45]} />
      <Tree position={[1.2, 0.14, -0.75]} scale={1.15} />
      <Tree position={[0.45, 0.14, -1.25]} scale={0.8} />
    </group>
  )
}

function Book() {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.5
  })
  return (
    <group ref={ref} rotation={[0.35, 0, 0]}>
      {[-1, 1].map((side) => (
        <group key={side} rotation={[0, 0, -side * 0.28]}>
          <mesh position={[side * 0.38, 0, 0]}>
            <boxGeometry args={[0.76, 0.05, 1]} />
            <meshToonMaterial color={C.red} />
          </mesh>
          <mesh position={[side * 0.36, 0.045, 0]}>
            <boxGeometry args={[0.68, 0.04, 0.92]} />
            <meshToonMaterial color={C.cream} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Cap() {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = 0.6 + Math.sin(state.clock.elapsedTime * 0.7) * 0.4
  })
  return (
    <group ref={ref} rotation={[0.25, 0.6, 0]}>
      <mesh>
        <boxGeometry args={[1, 0.07, 1]} />
        <meshToonMaterial color={C.ink} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.32, 16]} />
        <meshToonMaterial color={C.ink} />
      </mesh>
      <mesh position={[0.42, -0.2, 0.42]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        <meshToonMaterial color={C.gold} />
      </mesh>
      <mesh position={[0.42, -0.43, 0.42]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshToonMaterial color={C.gold} />
      </mesh>
    </group>
  )
}

function Compass() {
  const needle = useRef<Group>(null)
  useFrame((state) => {
    if (needle.current) needle.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.3) * 0.5
  })
  return (
    <group rotation={[0.1, -0.35, 0]}>
      <mesh>
        <torusGeometry args={[0.45, 0.08, 10, 28]} />
        <meshToonMaterial color={C.gold} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 28]} />
        <meshToonMaterial color={C.cream} />
      </mesh>
      <group ref={needle} position={[0, 0, 0.05]}>
        <mesh position={[0, 0.17, 0]}>
          <coneGeometry args={[0.07, 0.34, 4]} />
          <meshToonMaterial color={C.red} />
        </mesh>
        <mesh position={[0, -0.17, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.07, 0.34, 4]} />
          <meshToonMaterial color={C.ink} />
        </mesh>
      </group>
    </group>
  )
}

/** Welcome-page hero. Lazy-loaded so three.js never ships in the first download. */
export default function HeroScene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 1.1, 8.6], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} />
      <Float speed={1.2} floatIntensity={0.5} rotationIntensity={0.12}>
        <group position={[0, -0.9, 0]} rotation={[0.12, -0.5, 0]}>
          <Island />
        </group>
      </Float>
      <Float position={[-1.55, 1.45, 0.3]} speed={1.8} floatIntensity={1}>
        <Cap />
      </Float>
      <Float position={[0.1, 1.85, 0]} speed={1.5} floatIntensity={0.8}>
        <Book />
      </Float>
      <Float position={[1.6, 1.25, 0.3]} speed={1.6} floatIntensity={1}>
        <Compass />
      </Float>
      <Sparkles count={40} scale={[7, 4.5, 3]} size={3} speed={0.35} color={C.gold} />
    </Canvas>
  )
}
