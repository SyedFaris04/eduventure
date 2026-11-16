import type { MonsterKind } from '../map'

const INK = '#3b2a1e'
const S = `stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`

/** Friendly cheek blush and big shiny eyes shared by every monster. */
const eyes = (lx: number, rx: number, y: number, r = 9) =>
  [lx, rx].map((x) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="#1f130b"/><circle cx="${x + 3}" cy="${y - 4}" r="${r * 0.38}" fill="#fff"/>`).join('')
const blush = (lx: number, rx: number, y: number) => `<ellipse cx="${lx}" cy="${y}" rx="9" ry="5" fill="#f28b82" opacity="0.55"/><ellipse cx="${rx}" cy="${y}" rx="9" ry="5" fill="#f28b82" opacity="0.55"/>`

const ART: Record<MonsterKind, string> = {
  // A leafy slime with a sprout on its head.
  sproutling: `
    <ellipse cx="100" cy="182" rx="56" ry="10" fill="#000" opacity="0.15"/>
    <path d="M100 66 C 96 50 82 40 66 44 C 70 58 84 66 100 66 Z" fill="#5e9c35" ${S}/>
    <path d="M100 66 C 104 46 120 36 138 40 C 132 56 116 66 100 66 Z" fill="#6fae4a" ${S}/>
    <path d="M100 66 V 82" ${S}/>
    <path d="M40 176 C 32 132 56 82 100 82 C 144 82 168 132 160 176 Z" fill="#9ccc65" ${S}/>
    <path d="M58 168 C 56 140 70 112 92 104" stroke="#c5e1a5" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8"/>
    ${eyes(80, 120, 128)}${blush(66, 134, 146)}
    <path d="M90 148 Q100 158 110 148" stroke="#1f130b" stroke-width="4" fill="none" stroke-linecap="round"/>`,

  // A round pebble bird with stubby wings.
  pebblewing: `
    <ellipse cx="100" cy="182" rx="50" ry="9" fill="#000" opacity="0.15"/>
    <path d="M82 176 l-6 10 M90 176 l0 10 M110 176 l0 10 M118 176 l6 10" stroke="#f2994a" stroke-width="5" stroke-linecap="round"/>
    <path d="M34 112 C 14 100 12 130 30 138 C 38 142 46 134 46 126 Z" fill="#8796a8" ${S}/>
    <path d="M166 112 C 186 100 188 130 170 138 C 162 142 154 134 154 126 Z" fill="#8796a8" ${S}/>
    <ellipse cx="100" cy="122" rx="62" ry="56" fill="#a3b1c2" ${S}/>
    <ellipse cx="100" cy="138" rx="38" ry="30" fill="#d7dee6"/>
    <circle cx="70" cy="92" r="5" fill="#8796a8"/><circle cx="128" cy="86" r="4" fill="#8796a8"/><circle cx="140" cy="112" r="5" fill="#8796a8"/>
    <path d="M80 70 Q100 52 120 70" stroke="#8796a8" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${eyes(82, 118, 112)}${blush(68, 132, 130)}
    <path d="M92 128 L108 128 L100 140 Z" fill="#f2994a" ${S}/>`,

  // A chubby baby dinosaur with a cream belly and soft back spikes.
  dinobud: `
    <ellipse cx="104" cy="184" rx="64" ry="10" fill="#000" opacity="0.15"/>
    <path d="M150 150 C 178 150 190 168 186 182 C 172 176 160 172 146 172 Z" fill="#d9894a" ${S}/>
    <path d="M128 52 l12 -14 6 18 Z M146 70 l16 -8 -2 18 Z M156 96 l18 -2 -8 16 Z" fill="#e2574c" ${S}/>
    <path d="M58 180 C 46 140 54 96 84 70 C 98 58 128 58 142 74 C 162 98 166 140 154 180 Z" fill="#d9894a" ${S}/>
    <path d="M78 178 C 72 150 78 122 104 114 C 128 122 136 150 130 178 Z" fill="#fff6e3"/>
    <ellipse cx="96" cy="74" rx="44" ry="34" fill="#d9894a" ${S}/>
    <path d="M58 74 Q 54 96 76 100 L 110 100" fill="#d9894a" ${S}/>
    <path d="M62 92 Q 84 104 112 96" stroke="#1f130b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M72 94 l3 6 3 -5 M88 98 l3 6 3 -6" stroke="#fff" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <path d="M86 66 Q 94 58 102 66 M112 64 Q 120 56 128 64" stroke="#1f130b" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    ${blush(78, 128, 82)}
    <path d="M70 134 q -12 4 -10 14 M138 134 q 12 4 10 14" stroke="${INK}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M70 134 q -12 4 -10 14 M138 134 q 12 4 10 14" stroke="#d9894a" stroke-width="5" fill="none" stroke-linecap="round"/>`,
}

/** The Greenhaven Guardian: a gentle, mossy stone golem with a glowing rune. */
const GUARDIAN = `
  <ellipse cx="100" cy="186" rx="72" ry="11" fill="#000" opacity="0.18"/>
  <rect x="58" y="150" width="30" height="34" rx="10" fill="#8f98a3" ${S}/>
  <rect x="112" y="150" width="30" height="34" rx="10" fill="#8f98a3" ${S}/>
  <path d="M26 118 C 14 104 18 82 34 82 C 46 82 52 96 50 112 L 46 150 C 36 156 24 148 26 118 Z" fill="#a3acb6" ${S}/>
  <path d="M174 118 C 186 104 182 82 166 82 C 154 82 148 96 150 112 L 154 150 C 164 156 176 148 174 118 Z" fill="#a3acb6" ${S}/>
  <path d="M44 74 C 44 40 70 22 100 22 C 130 22 156 40 156 74 L 152 154 C 130 166 70 166 48 154 Z" fill="#b6bec8" ${S}/>
  <path d="M46 70 C 50 44 72 30 100 30 C 128 30 150 44 154 70 C 140 60 128 66 118 58 C 106 70 92 60 82 68 C 72 60 60 66 46 70 Z" fill="#7cb342" ${S}/>
  <path d="M70 36 l-8 -16 14 6 Z M100 28 l0 -20 10 14 Z M130 36 l8 -16 -14 6 Z" fill="#5e9c35" ${S}/>
  <circle cx="72" cy="128" r="6" fill="#8f98a3"/><circle cx="136" cy="136" r="5" fill="#8f98a3"/><circle cx="118" cy="148" r="4" fill="#8f98a3"/>
  <path d="M100 104 l14 16 -14 16 -14 -16 Z" fill="#6cc4f0" stroke="#2f7fb0" stroke-width="3"/>
  <circle cx="100" cy="120" r="5" fill="#e8f7ff"/>
  ${eyes(82, 118, 84, 8)}
  <path d="M90 96 Q100 102 110 96" stroke="#1f130b" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${blush(70, 130, 96)}`

export const renderBossSvg = (size = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${GUARDIAN}</svg>`
export const bossDataUri = (size?: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderBossSvg(size))}`

/** Same approach as characters: one SVG string feeds both the world sprite and the battle portrait. */
export function renderMonsterSvg(kind: MonsterKind, size = 200): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${ART[kind]}</svg>`
}

export const monsterDataUri = (kind: MonsterKind, size?: number) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderMonsterSvg(kind, size))}`
