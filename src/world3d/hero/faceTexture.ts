// Eyes and mouths drawn into small canvases, following the shapes of the 2D character art.
const FEATURE = '#1f130b'
const INK = '#3b2a1e'

function canvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c.getContext('2d')
}

/** 256 × 104 canvas; the two eyes sit at x 64 and 192. */
export function drawEyes(style: string): HTMLCanvasElement | null {
  const g = canvas(256, 104)
  if (!g) return null
  g.lineCap = 'round'
  g.lineWidth = 11
  g.strokeStyle = FEATURE
  for (const x of [64, 192]) {
    const y = 56
    g.beginPath()
    if (style === 'happy') {
      g.moveTo(x - 26, y + 8)
      g.quadraticCurveTo(x, y - 30, x + 26, y + 8)
      g.stroke()
    } else if (style === 'sleepy') {
      g.moveTo(x - 26, y)
      g.quadraticCurveTo(x, y + 24, x + 26, y)
      g.stroke()
    } else {
      const big = style === 'sparkle'
      g.fillStyle = big ? '#5a3a22' : FEATURE
      g.ellipse(x, y, big ? 27 : 22, big ? 34 : 29, 0, 0, Math.PI * 2)
      g.fill()
      if (big) {
        g.lineWidth = 5
        g.strokeStyle = INK
        g.stroke()
      }
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.arc(x + 8, y - 12, big ? 11 : 8, 0, Math.PI * 2)
      g.fill()
      if (big) {
        g.beginPath()
        g.arc(x - 9, y + 13, 5, 0, Math.PI * 2)
        g.fill()
      }
    }
  }
  if (style === 'determined') {
    g.lineWidth = 10
    g.strokeStyle = FEATURE
    g.beginPath()
    g.moveTo(34, 8)
    g.lineTo(90, 22)
    g.moveTo(222, 8)
    g.lineTo(166, 22)
    g.stroke()
  }
  return g.canvas
}

/** 128 × 64 canvas with the mouth in the middle and blush at the sides. */
export function drawMouth(style: string): HTMLCanvasElement | null {
  const g = canvas(128, 64)
  if (!g) return null
  g.fillStyle = 'rgba(242,139,130,0.5)'
  for (const x of [12, 116]) {
    g.beginPath()
    g.ellipse(x, 14, 12, 7, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.lineCap = 'round'
  g.lineWidth = 8
  g.strokeStyle = FEATURE
  g.beginPath()
  switch (style) {
    case 'grin':
      g.moveTo(40, 14)
      g.quadraticCurveTo(64, 70, 88, 14)
      g.closePath()
      g.fillStyle = '#b5413a'
      g.fill()
      g.stroke()
      break
    case 'calm':
      g.moveTo(50, 24)
      g.quadraticCurveTo(64, 32, 78, 24)
      g.stroke()
      break
    case 'surprised':
      g.ellipse(64, 30, 12, 16, 0, 0, Math.PI * 2)
      g.fillStyle = '#7a2e2e'
      g.fill()
      break
    case 'cheeky':
      g.moveTo(36, 16)
      g.quadraticCurveTo(64, 44, 92, 16)
      g.stroke()
      g.beginPath()
      g.ellipse(76, 38, 10, 12, 0, 0, Math.PI * 2)
      g.fillStyle = '#f28b82'
      g.fill()
      break
    default: // smile
      g.moveTo(38, 16)
      g.quadraticCurveTo(64, 46, 90, 16)
      g.stroke()
  }
  return g.canvas
}
