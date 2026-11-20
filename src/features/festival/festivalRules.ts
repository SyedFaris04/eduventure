import { CATALOGUE, type ShopItem } from '../shop/catalogue'

export const FESTIVAL_KINDS = ['school_holiday', 'cny', 'raya', 'merdeka', 'deepavali'] as const
export type FestivalKind = (typeof FESTIVAL_KINDS)[number]
export type FestivalItem = Extract<ShopItem, { festival: string }>

const isFestivalItem = (i: ShopItem): i is FestivalItem => 'festival' in i

/** A festival's stall items: the hero item first, then the pet item. */
export const FESTIVAL_ITEMS = (kind: FestivalKind): FestivalItem[] =>
  CATALOGUE.filter(isFestivalItem)
    .filter((i) => i.festival === kind)
    .sort((a, b) => Number(a.slot.startsWith('pet_')) - Number(b.slot.startsWith('pet_')))

/** A short day and month ("3 Jan") for a festival's last day, with no countdown. */
export function untilLabel(endsOn: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${endsOn}T00:00:00Z`))
}
