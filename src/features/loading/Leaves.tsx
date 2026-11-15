// Fixed pseudo-random layout so the scene looks the same on every load.
const LEAVES = [
  { left: 4, size: 22, dur: 13, delay: -2, hue: 0 },
  { left: 12, size: 16, dur: 16, delay: -9, hue: 20 },
  { left: 21, size: 26, dur: 11, delay: -5, hue: -10 },
  { left: 33, size: 14, dur: 18, delay: -14, hue: 35 },
  { left: 41, size: 20, dur: 14, delay: -1, hue: 0 },
  { left: 52, size: 18, dur: 12, delay: -7, hue: 50 },
  { left: 60, size: 24, dur: 15, delay: -11, hue: -15 },
  { left: 68, size: 15, dur: 17, delay: -4, hue: 25 },
  { left: 77, size: 21, dur: 13, delay: -12, hue: 0 },
  { left: 85, size: 17, dur: 19, delay: -6, hue: 40 },
  { left: 92, size: 23, dur: 12, delay: -15, hue: -5 },
  { left: 97, size: 14, dur: 16, delay: -3, hue: 15 },
]

/** Drifting leaves over the art, animated purely in CSS (see loading.css). */
export function Leaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {LEAVES.map((l, i) => (
        <span
          key={i}
          className="leaf-fall absolute top-0"
          style={{ left: `${l.left}%`, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s` }}
        >
          <svg
            className="leaf-sway block"
            width={l.size}
            height={l.size}
            viewBox="0 0 24 24"
            style={{ animationDuration: `${l.dur / 4}s`, filter: `hue-rotate(${l.hue}deg)` }}
          >
            <path d="M3 21C3 11 9 4 21 3c0 12-7 18-18 18Z" fill="#7cc04a" stroke="#4a7a2a" strokeWidth="1.5" />
            <path d="M5 19 17 7" stroke="#4a7a2a" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  )
}
