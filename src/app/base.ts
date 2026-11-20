/** The game is served at / locally and at /eduventure/play/ on GitHub Pages (Vite's `base`, from BASE_PATH). */

/** A path inside the app, under the base: withBase('/assets/x') → '/eduventure/play/assets/x' on Pages. */
export const withBase = (path: string, base: string = import.meta.env.BASE_URL) => base.replace(/\/$/, '') + '/' + path.replace(/^\//, '')

/** An absolute link to a page of the game, for emails and links shared with parents. */
export const appUrl = (path: string, origin: string = location.origin, base: string = import.meta.env.BASE_URL) => origin + withBase(path, base)

export const routerBasename = (base: string = import.meta.env.BASE_URL) => base.replace(/\/$/, '') || '/'
