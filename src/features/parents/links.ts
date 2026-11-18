/** The link a child sends to a parent; the parent opens it on their own phone. */
export const parentLink = (code: string, origin: string = location.origin) => `${origin}/parent?code=${code}`
export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
