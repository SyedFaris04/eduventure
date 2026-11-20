/** 3D only where it can draw and is wanted; otherwise each scene shows its still picture. */
export const should3D = (env: { webgl: boolean; reducedMotion: boolean }) => env.webgl && !env.reducedMotion
