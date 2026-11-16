import { sanitizeAppearance, type Appearance } from './appearance'

/**
 * The one character renderer: the creator preview shows this SVG and Phase 2 rasterises the same
 * string into Phaser textures, so the two can never disagree. Every value is looked up in fixed
 * tables after sanitizeAppearance(), so player data never reaches the markup as raw text.
 */
export const LAYERS = ['backpack', 'body', 'bottom', 'shoes', 'top', 'head', 'face', 'eyes', 'hair', 'accessory', 'weapon'] as const
type Layer = (typeof LAYERS)[number]

const INK = '#3b2a1e'
const FEATURE = '#1f130b' // eyes and mouth: darker than outlines so they read on every skin tone
const S =`stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, Math.round(c * (1 + amount)))))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Walk cycle moment: 0 = standing, 1 = left leg lifted, −1 = right leg lifted. */
export type Step = -1 | 0 | 1
type Geo = { left: number; right: number; w: number; step: Step }
const TORSO_WIDTH = { a: 56, b: 66, c: 50 } as const
const SHOULDER_Y = 154
const ARM_LENGTH = 46
// A bouncy chibi march: exaggerated so the step still reads when the sprite is ~70 px tall in the world.
const LIFT = 15 // how far a stepping foot leaves the ground
const SWING = 20 // arm swing in degrees

const lift = (g: Geo, side: 'l' | 'r') => ((side === 'l' ? g.step === 1 : g.step === -1) ? LIFT : 0)
// Arms swing opposite to the legs: when the left leg lifts, the arms rotate the other way.
const armAngle = (g: Geo, side: 'l' | 'r') => (side === 'l' ? 8 : -8) - SWING * g.step
const armX = (g: Geo, side: 'l' | 'r') => (side === 'l' ? g.left - 16 : g.right)

const arm = (g: Geo, side: 'l' | 'r', fill: string, length = ARM_LENGTH) => {
  const x = armX(g, side)
  return `<rect x="${x}" y="${SHOULDER_Y}" width="16" height="${length}" rx="8" fill="${fill}" ${S} transform="rotate(${armAngle(g, side)} ${x + 8} ${SHOULDER_Y})"/>`
}
/** End of the arm after rotation, where the hand (and any held weapon) goes. */
const hand = (g: Geo, side: 'l' | 'r') => {
  const a = (armAngle(g, side) * Math.PI) / 180
  const r = (n: number) => Math.round(n * 10) / 10
  return { x: r(armX(g, side) + 8 - ARM_LENGTH * Math.sin(a)), y: r(SHOULDER_Y + ARM_LENGTH * Math.cos(a)) }
}
/** Left and right leg columns (x of the leg's left edge). */
const LEGS = { l: 78, r: 104 } as const
const FEET = { l: 87, r: 113 } as const

function backpack(a: Appearance, g: Geo): string {
  switch (a.backpack) {
    case 'satchel':
      return `<rect x="${g.left - 28}" y="186" width="30" height="26" rx="6" fill="#a0612f" ${S}/><path d="M${g.left - 28} 192 h30 v8 q-15 6 -30 0 Z" fill="#8a4f24" ${S}/>`
    case 'explorer':
      return `<rect x="${g.left - 34}" y="148" width="40" height="58" rx="10" fill="#8a5a3b" ${S}/><rect x="${g.left - 38}" y="136" width="50" height="17" rx="8" fill="#5e8c31" ${S}/><rect x="${g.left - 28}" y="176" width="20" height="16" rx="4" fill="#a87048" ${S}/>`
    case 'book_bag':
      return `<rect x="${g.right + 2}" y="136" width="8" height="18" fill="#d9534f" ${S}/><rect x="${g.right + 12}" y="132" width="9" height="22" fill="#f7c843" ${S}/><rect x="${g.right - 6}" y="148" width="36" height="46" rx="8" fill="#4f7fc7" ${S}/>`
    case 'scroll_case':
      return `<g transform="rotate(-35 100 172)"><rect x="92" y="104" width="16" height="136" rx="8" fill="#c0874f" ${S}/><rect x="90" y="104" width="20" height="12" rx="4" fill="#8a5a3b" ${S}/></g>`
    default:
      return ''
  }
}

function body(a: Appearance, g: Geo): string {
  const s = a.skin
  return [
    `<rect x="91" y="136" width="18" height="20" fill="${shade(s, -0.12)}" ${S}/>`,
    ...(['l', 'r'] as const).map((side) => `<rect x="${LEGS[side]}" y="196" width="18" height="${42 - lift(g, side)}" rx="6" fill="${s}" ${S}/>`),
    `<rect x="${g.left}" y="148" width="${g.w}" height="58" rx="20" fill="${s}" ${S}/>`,
    arm(g, 'l', s),
    arm(g, 'r', s),
    ...(['l', 'r'] as const).map((side) => `<circle cx="${hand(g, side).x}" cy="${hand(g, side).y}" r="9" fill="${s}" ${S}/>`),
  ].join('')
}

/** Trousers, shorts and leggings: one leg piece per side (so each can step) under a shared waistband. */
function legwear(g: Geo, fill: string, length: number, width = 22) {
  const legs = (['l', 'r'] as const)
    .map((side) => {
      const x = side === 'l' ? LEGS.l - 1 : LEGS.r - 3
      const h = Math.max(8, length - lift(g, side) * (length > 30 ? 1 : 0.5))
      return `<rect x="${x}" y="198" width="${width}" height="${h}" rx="6" fill="${fill}" ${S}/>`
    })
    .join('')
  return legs + `<rect x="76" y="193" width="48" height="13" rx="6" fill="${fill}" ${S}/>`
}

function bottom(a: Appearance, g: Geo): string {
  switch (a.bottom) {
    case 'shorts_brown':
      return legwear(g, '#8a5a3b', 22)
    case 'skirt_red':
      return `<path d="M76 192 H124 L132 226 Q100 234 68 226 Z" fill="#d9534f" ${S}/><path d="M86 206 l-4 18 M114 206 l4 18" stroke="#b03e3a" stroke-width="2"/>`
    case 'leggings_blue':
      return legwear(g, '#4f7fc7', 40, 20)
    default:
      return legwear(g, '#3d3b52', 40)
  }
}

function shoes(a: Appearance, g: Geo): string {
  const feet = (['l', 'r'] as const).map((side) => ({ x: FEET[side], up: lift(g, side) }))
  switch (a.shoes) {
    case 'sneakers_red':
      return feet.map(({ x, up }) => `<ellipse cx="${x}" cy="${242 - up}" rx="14" ry="8" fill="#e2574c" ${S}/><path d="M${x - 12} ${245 - up} h24" stroke="#fff" stroke-width="3"/>`).join('')
    case 'sandals':
      return feet.map(({ x, up }) => `<ellipse cx="${x}" cy="${245 - up}" rx="13" ry="5" fill="#c0874f" ${S}/><path d="M${x - 8} ${238 - up} q8 6 16 0" stroke="#8a5a3b" stroke-width="3" fill="none"/>`).join('')
    case 'boots_black':
      return feet.map(({ x, up }) => `<rect x="${x - 10}" y="${226 - up}" width="20" height="16" rx="4" fill="#2e2a3a" ${S}/><ellipse cx="${x}" cy="${242 - up}" rx="14" ry="7" fill="#2e2a3a" ${S}/>`).join('')
    default:
      return feet
        .map(({ x, up }) => `<rect x="${x - 10}" y="${226 - up}" width="20" height="16" rx="4" fill="#6b4226" ${S}/><ellipse cx="${x}" cy="${242 - up}" rx="14" ry="7" fill="#6b4226" ${S}/><path d="M${x - 10} ${230 - up} h20" stroke="#4a2c18" stroke-width="2"/>`)
        .join('')
  }
}

function top(a: Appearance, g: Geo): string {
  const shirt = (fill: string, bottomY = 200) =>
    `<rect x="${g.left - 1}" y="146" width="${g.w + 2}" height="${bottomY - 146}" rx="20" fill="${fill}" ${S}/>` + arm(g, 'l', fill, 24) + arm(g, 'r', fill, 24)
  switch (a.top) {
    case 'tunic_green':
      return shirt('#6fae4a') + `<rect x="${g.left}" y="184" width="${g.w}" height="8" fill="#8a5a3b" ${S}/><rect x="95" y="183" width="10" height="10" rx="2" fill="#f7c843" ${S}/>`
    case 'vest_blue':
      return (
        shirt('#f6f1e4') +
        `<path d="M${g.left} 160 Q${g.left} 148 ${g.left + 12} 147 L96 150 L94 200 L${g.left + 4} 200 Q${g.left} 190 ${g.left} 180 Z" fill="#4f7fc7" ${S}/>` +
        `<path d="M${g.right} 160 Q${g.right} 148 ${g.right - 12} 147 L104 150 L106 200 L${g.right - 4} 200 Q${g.right} 190 ${g.right} 180 Z" fill="#4f7fc7" ${S}/>`
      )
    case 'hoodie_orange':
      return (
        `<path d="M76 152 Q100 136 124 152" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M76 152 Q100 136 124 152" stroke="#e8893a" stroke-width="7" fill="none" stroke-linecap="round"/>` +
        shirt('#f2994a') +
        `<rect x="84" y="180" width="32" height="16" rx="6" fill="#e8893a" ${S}/><path d="M94 152 v14 M106 152 v14" stroke="#fff6e3" stroke-width="2.5"/>`
      )
    case 'robe_purple':
      return (
        `<path d="M${g.left - 1} 166 Q${g.left - 1} 146 ${g.left + 18} 146 H${g.right - 18} Q${g.right + 1} 146 ${g.right + 1} 166 L${g.right + 8} 228 H${g.left - 8} Z" fill="#7e5bb5" ${S}/>` +
        arm(g, 'l', '#7e5bb5', 30) +
        arm(g, 'r', '#7e5bb5', 30) +
        `<path d="M${g.left - 6} 222 H${g.right + 6}" stroke="#f7c843" stroke-width="3"/><path d="M100 170 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#f7c843" stroke="${INK}" stroke-width="1.5"/>`
      )
    case 'dress_pink':
      return (
        `<path d="M${g.left} 184 L${g.left - 12} 226 Q100 236 ${g.right + 12} 226 L${g.right} 184 Z" fill="#e88fb4" ${S}/>` +
        shirt('#e88fb4', 192) +
        `<path d="M${g.left - 6} 214 Q100 224 ${g.right + 6} 214" stroke="#fff6e3" stroke-width="3" fill="none"/>`
      )
    default: // scarf_red: explorer shirt with a red scarf, like the hero of the loading art
      return (
        shirt('#f6f1e4') +
        `<path d="M${g.left + 4} 152 L92 152 L92 200 L${g.left + 4} 200 Z" fill="#5b8ed6" ${S}/><path d="M${g.right - 4} 152 L108 152 L108 200 L${g.right - 4} 200 Z" fill="#5b8ed6" ${S}/>` +
        `<path d="M108 154 L124 184 L114 186 L102 160 Z" fill="#d9534f" ${S}/><ellipse cx="100" cy="150" rx="26" ry="9" fill="#e2574c" ${S}/>`
      )
  }
}

function head(a: Appearance): string {
  const s = a.skin
  return (
    `<circle cx="44" cy="102" r="11" fill="${s}" ${S}/><circle cx="156" cy="102" r="11" fill="${s}" ${S}/>` +
    `<circle cx="45" cy="102" r="5" fill="${shade(s, -0.15)}"/><circle cx="155" cy="102" r="5" fill="${shade(s, -0.15)}"/>` +
    `<ellipse cx="100" cy="92" rx="57" ry="53" fill="${s}" ${S}/>`
  )
}

function face(a: Appearance): string {
  const blush = `<ellipse cx="70" cy="114" rx="9" ry="5" fill="#f28b82" opacity="0.45"/><ellipse cx="130" cy="114" rx="9" ry="5" fill="#f28b82" opacity="0.45"/>`
  const line = `stroke="${FEATURE}" stroke-width="3" stroke-linecap="round" fill="none"`
  switch (a.face) {
    case 'grin':
      return blush + `<path d="M88 116 Q100 134 112 116 Z" fill="#b5413a" ${S}/><path d="M94 125 Q100 129 106 125" stroke="#f28b82" stroke-width="3" fill="none"/>`
    case 'calm':
      return blush + `<path d="M94 121 Q100 124 106 121" ${line}/>`
    case 'surprised':
      return blush + `<ellipse cx="100" cy="122" rx="5" ry="6.5" fill="#7a2e2e" ${S}/>`
    case 'cheeky':
      return blush + `<path d="M89 118 Q100 128 111 118" ${line}/><ellipse cx="105" cy="125" rx="4" ry="4.5" fill="#f28b82" ${S}/>`
    default:
      return blush + `<path d="M90 118 Q100 128 110 118" ${line}/>`
  }
}

function eyes(a: Appearance): string {
  const at = [78, 122]
  const y = 100
  const round = (x: number) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="9" fill="${FEATURE}"/><circle cx="${x + 2.5}" cy="${y - 3.5}" r="2.6" fill="#fff"/>`
  switch (a.eyes) {
    case 'happy':
      return at.map((x) => `<path d="M${x - 8} ${y + 2} Q${x} ${y - 9} ${x + 8} ${y + 2}" stroke="${FEATURE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`).join('')
    case 'sparkle':
      return at
        .map((x) => `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="10.5" fill="#5a3a22" stroke="${INK}" stroke-width="2"/><circle cx="${x + 3}" cy="${y - 4}" r="3.6" fill="#fff"/><circle cx="${x - 3}" cy="${y + 4}" r="1.7" fill="#fff"/>`)
        .join('')
    case 'sleepy':
      return at.map((x) => `<path d="M${x - 8} ${y} Q${x} ${y + 7} ${x + 8} ${y}" stroke="${FEATURE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`).join('')
    case 'determined':
      return (
        at.map(round).join('') +
        `<path d="M68 85 L86 90 M132 85 L114 90" stroke="${FEATURE}" stroke-width="3.5" stroke-linecap="round"/>`
      )
    default:
      return at.map(round).join('')
  }
}

function hair(a: Appearance, facing: 'front' | 'back'): string {
  const c = a.hairColour
  const d = shade(c, -0.28)
  const f = `fill="${c}" ${S}`
  const cap = `<path d="M43 106 C36 58 66 32 100 32 C134 32 164 58 157 106 L150 86 Q141 74 128 70 Q120 84 106 79 Q99 70 92 81 Q80 86 68 74 Q57 84 50 98 Z" ${f}/><path d="M70 46 Q86 38 104 40" stroke="${shade(c, 0.3)}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.7"/>`

  if (a.hairStyle === 'hijab') {
    const outer = 'M30 174 C22 132 26 96 36 76 C48 42 76 28 100 28 C124 28 152 42 164 76 C174 96 178 132 170 174 Q100 188 30 174 Z'
    const hole = 'M100 56 C127 56 147 76 147 101 C147 126 127 144 100 144 C73 144 53 126 53 101 C53 76 73 56 100 56 Z'
    return facing === 'back'
      ? `<path d="${outer}" ${f}/>`
      : `<path d="${outer} ${hole}" fill-rule="evenodd" ${f}/><path d="M62 154 Q100 170 138 154" stroke="${d}" stroke-width="3" fill="none"/>`
  }
  if (facing === 'back') {
    const tail = a.hairStyle === 'long' || a.hairStyle === 'braid' ? `<path d="M50 100 Q44 170 64 180 H136 Q156 170 150 100 Z" ${f}/>` : ''
    return tail + `<ellipse cx="100" cy="90" rx="59" ry="55" ${f}/>`
  }

  switch (a.hairStyle) {
    case 'spiky':
      return `<path d="M58 58 L48 22 L76 44 Z M80 40 L86 6 L102 36 Z M104 36 L126 8 L124 42 Z M128 46 L156 26 L148 62 Z" ${f}/>` + cap
    case 'bob':
      return `<path d="M44 92 Q34 132 50 142 L68 138 Q58 118 62 96 Z M156 92 Q166 132 150 142 L132 138 Q142 118 138 96 Z" ${f}/>` + cap
    case 'long':
      return `<path d="M44 90 Q28 150 40 184 L66 178 Q56 130 62 96 Z M156 90 Q172 150 160 184 L134 178 Q144 130 138 96 Z" ${f}/>` + cap
    case 'ponytail':
      return `<path d="M148 58 Q190 66 182 120 Q178 152 160 164 Q170 120 150 86 Z" ${f}/>` + cap + `<circle cx="152" cy="62" r="7" fill="#e2574c" ${S}/>`
    case 'buns':
      return `<circle cx="62" cy="42" r="19" ${f}/><circle cx="138" cy="42" r="19" ${f}/>` + cap
    case 'curly':
      return [48, 62, 80, 100, 120, 138, 152].map((x, i) => `<circle cx="${x}" cy="${[78, 50, 36, 30, 36, 50, 78][i]}" r="14" ${f}/>`).join('') + cap
    case 'afro':
      return `<path d="M36 118 C10 92 18 30 64 18 C82 2 118 2 136 18 C182 30 190 92 164 118 C160 96 152 80 140 72 Q100 60 60 72 C48 80 40 96 36 118 Z" ${f}/><path d="M60 40 q8 -8 16 0 M110 30 q8 -8 16 0 M140 56 q8 -8 16 0" stroke="${d}" stroke-width="3" fill="none"/>`
    case 'braid':
      return cap + [104, 122, 140, 158].map((y) => `<ellipse cx="46" cy="${y}" rx="10" ry="11" ${f}/>`).join('') + `<circle cx="46" cy="172" r="5" fill="#e2574c" ${S}/>`
    case 'buzz':
      return `<path d="M46 94 C44 52 72 36 100 36 C128 36 156 52 154 94 Q100 68 46 94 Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity="0.92"/>`
    default: // short
      return cap
  }
}

function accessory(a: Appearance): string {
  switch (a.accessory) {
    case 'flower':
      return [0, 72, 144, 216, 288]
        .map((deg) => `<circle cx="${140 + 7 * Math.cos((deg * Math.PI) / 180)}" cy="${54 + 7 * Math.sin((deg * Math.PI) / 180)}" r="6" fill="#f7a8c4" stroke="${INK}" stroke-width="2"/>`)
        .join('') + `<circle cx="140" cy="54" r="4" fill="#f7c843"/>`
    case 'glasses':
      return `<circle cx="78" cy="100" r="13" fill="#ffffff" fill-opacity="0.15" stroke="${INK}" stroke-width="2.5"/><circle cx="122" cy="100" r="13" fill="#ffffff" fill-opacity="0.15" stroke="${INK}" stroke-width="2.5"/><path d="M91 100 Q100 95 109 100 M65 98 L46 94 M135 98 L154 94" stroke="${INK}" stroke-width="2.5" fill="none"/>`
    case 'grad_cap':
      return `<path d="M70 42 V56 Q100 66 130 56 V42 Z" fill="#2e2a3a" ${S}/><path d="M46 38 L100 18 L154 38 L100 58 Z" fill="#3a3550" ${S}/><path d="M100 38 L146 46 V66" stroke="#f7c843" stroke-width="2.5" fill="none"/><circle cx="146" cy="68" r="4" fill="#f7c843" ${S}/>`
    case 'headband':
      return `<path d="M47 76 Q100 40 153 76" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M47 76 Q100 40 153 76" stroke="#e2574c" stroke-width="7" fill="none" stroke-linecap="round"/>`
    case 'star_clip':
      return `<path d="M62 52 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 Z" fill="#f7c843" ${S}/>`
    default:
      return ''
  }
}

function weapon(a: Appearance, g: Geo): string {
  const h = hand(g, 'r')
  const grip = `<circle cx="${h.x}" cy="${h.y}" r="9" fill="${a.skin}" ${S}/>`
  switch (a.weapon) {
    case 'short_bow':
      return `<g transform="translate(${h.x} ${h.y}) rotate(-8)"><path d="M-2 -62 L-2 62" stroke="#f4f1ea" stroke-width="1.5"/><path d="M-2 -62 Q34 0 -2 62" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-2 -62 Q34 0 -2 62" stroke="#a0612f" stroke-width="5" fill="none" stroke-linecap="round"/></g>` + grip
    case 'apprentice_staff':
      return `<g transform="rotate(8 ${h.x} ${h.y})"><rect x="${h.x - 4}" y="${h.y - 106}" width="8" height="150" rx="4" fill="#8a5a3b" ${S}/><circle cx="${h.x}" cy="${h.y - 112}" r="12" fill="#6cc4f0" ${S}/><circle cx="${h.x + 4}" cy="${h.y - 116}" r="3.5" fill="#fff"/></g>` + grip
    case 'quill':
      return `<g transform="translate(${h.x} ${h.y}) rotate(18)"><path d="M0 8 Q-20 -40 0 -92 Q20 -40 0 8 Z" fill="#f4f1ea" ${S}/><path d="M0 4 V-84" stroke="#c9bfa8" stroke-width="2"/><path d="M-3 8 L0 22 L3 8" fill="${INK}"/></g>` + grip
    default: // wooden_sword
      // Blade angled outward so it never crosses the face.
      return `<g transform="translate(${h.x} ${h.y}) rotate(22)"><path d="M-6 -10 V-74 L0 -86 L6 -74 V-10 Z" fill="#d9b38c" ${S}/><path d="M0 -14 V-76" stroke="#b98f62" stroke-width="2"/><rect x="-14" y="-12" width="28" height="7" rx="3" fill="#8a5a3b" ${S}/><rect x="-3.5" y="-6" width="7" height="16" rx="3" fill="#6b4226" ${S}/></g>` + grip
  }
}

export function renderCharacterSvg(input: Appearance, opts: { facing?: 'front' | 'back'; size?: number; step?: Step } = {}): string {
  const a = sanitizeAppearance(input)
  const facing = opts.facing ?? 'front'
  const size = opts.size ?? 200
  const w = TORSO_WIDTH[a.body]
  const g: Geo = { w, left: 100 - w / 2, right: 100 + w / 2, step: opts.step ?? 0 }
  const parts: Record<Layer, string> = {
    backpack: backpack(a, g),
    body: body(a, g),
    bottom: bottom(a, g),
    shoes: shoes(a, g),
    top: top(a, g),
    head: head(a),
    face: facing === 'front' ? face(a) : '',
    eyes: facing === 'front' ? eyes(a) : '',
    hair: hair(a, facing),
    accessory: accessory(a),
    weapon: weapon(a, g),
  }
  const content = LAYERS.map((l) => `<g id="layer-${l}">${parts[l]}</g><!--/${l}-->`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 200 284" width="${size}" height="${Math.round(size * 1.42)}">${content}</svg>`
}

/** Data URI for <img src>: an image element never runs scripts, a second safety net on top of sanitizing. */
export const characterDataUri = (a: Appearance, opts?: { facing?: 'front' | 'back'; size?: number }) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCharacterSvg(a, opts))}`
