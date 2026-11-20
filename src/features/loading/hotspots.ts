import type { CSSProperties } from 'react'
import { withBase } from '../../app/base'

/** Measured in pixels on the 1672 × 941 loading artwork. Check with `/?debug=hotspots`. */
export const ART = { w: 1672, h: 941, webp: withBase('/assets/loading/eduventure-loading.webp'), png: withBase('/assets/loading/eduventure-loading.png') }

export type Rect = { x: number; y: number; w: number; h: number }

export type CharacterId = 'boy' | 'girl' | 'cat' | 'slime' | 'dino'

export const CHARACTERS: Record<CharacterId, Rect> = {
  boy: { x: 420, y: 290, w: 305, h: 425 },
  girl: { x: 698, y: 405, w: 268, h: 322 },
  cat: { x: 228, y: 472, w: 245, h: 215 },
  slime: { x: 358, y: 696, w: 146, h: 124 },
  dino: { x: 1012, y: 188, w: 446, h: 515 },
}

export const AMBIENT = {
  airship: { x: 22, y: 32, w: 222, h: 156 },
  portal: { x: 1430, y: 330, w: 170, h: 180 },
} satisfies Record<string, Rect>

/** Interface elements painted into the art; live versions are drawn exactly on top. */
export const PAINTED = {
  bar: { x: 354, y: 780, w: 818, h: 56 },
  percent: { x: 1168, y: 784, w: 120, h: 60 },
  tip: { x: 534, y: 854, w: 606, h: 52 },
  sound: { x: 25, y: 820, w: 100, h: 100 },
} satisfies Record<string, Rect>

/** Position a child of the art box over a rect, in % so it tracks the art at any size. */
export function placeAt(r: Rect): CSSProperties {
  return {
    position: 'absolute',
    left: `${(r.x / ART.w) * 100}%`,
    top: `${(r.y / ART.h) * 100}%`,
    width: `${(r.w / ART.w) * 100}%`,
    height: `${(r.h / ART.h) * 100}%`,
  }
}

/** Background that shows exactly the part of the art under `r`, for animating a "cut-out" copy. */
export function cutoutBackground(r: Rect): CSSProperties {
  return {
    backgroundImage: `url(${ART.webp})`,
    backgroundSize: `${(ART.w / r.w) * 100}% ${(ART.h / r.h) * 100}%`,
    backgroundPosition: `${(r.x / (ART.w - r.w)) * 100}% ${(r.y / (ART.h - r.h)) * 100}%`,
  }
}
