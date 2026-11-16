import type { Theme, TileKind } from '../game/map'

type ThemeLook = { sky: string; fog: [near: number, far: number]; water: string; pond: string; tiles: Partial<Record<TileKind, string>> }

const BASE: Record<TileKind, string> = {
  grass: '#8bc34a',
  flowers: '#8bc34a',
  path: '#f2b872',
  sand: '#f3d9a4',
  water: '#4fb0dd',
  bridge: '#a0612f',
  jetty: '#a0612f',
  snow: '#eef3f6',
  stone: '#b8b2a6',
  mud: '#8f6a48',
}

/** Sky, fog, water and ground colours per place, so each island reads differently at a glance (and in a clip). */
export const THEMES: Record<Theme, ThemeLook> = {
  kampung: { sky: '#5fb3d9', fog: [34, 70], water: '#4fb0dd', pond: '#6cc4f0', tiles: {} },
  rainforest: { sky: '#79bfb0', fog: [24, 58], water: '#3d9e9a', pond: '#4fb7a8', tiles: { grass: '#5f9e3c', flowers: '#5f9e3c', sand: '#d9c48f' } },
  alpine: { sky: '#a8d0ea', fog: [36, 76], water: '#5ea9d8', pond: '#7cc0e6', tiles: { grass: '#93c766', flowers: '#93c766' } },
}

export const tileColour = (theme: Theme, tile: TileKind) => THEMES[theme].tiles[tile] ?? BASE[tile]
