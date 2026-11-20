import { appUrl } from '../../app/base'

/** The link a child sends to a parent; the parent opens it on their own phone. */
export const parentLink = (code: string, origin: string = location.origin, base?: string) => appUrl(`/parent?code=${code}`, origin, base)
export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
