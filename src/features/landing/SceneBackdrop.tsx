/**
 * Painted-style sky, clouds, floating islands and hills in SVG. Always rendered behind the welcome
 * and explore pages; it is also the full fallback when the 3D hero is skipped.
 */
export function SceneBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#7fc8f0] via-[#bfe6f7] to-[#fdf2d6]">
      <div className="scene-sun absolute top-[8%] left-[12%] size-40 rounded-full bg-[radial-gradient(circle,#fff7d1_0%,#ffe9a0_35%,transparent_70%)]" />
      {[
        { top: '10%', size: 1, dur: 70, delay: -10 },
        { top: '22%', size: 0.7, dur: 90, delay: -50 },
        { top: '6%', size: 0.85, dur: 110, delay: -80 },
        { top: '30%', size: 0.55, dur: 80, delay: -30 },
      ].map((c, i) => (
        <svg
          key={i}
          className="scene-cloud absolute left-0"
          style={{ top: c.top, width: 260 * c.size, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
          viewBox="0 0 260 110"
        >
          <path d="M30 90c-22 0-30-26-10-36 0-26 34-36 50-18 10-30 60-34 74-6 18-16 52-8 52 18 26-2 40 32 14 42Z" fill="#fff" opacity="0.92" />
          <path d="M30 90h180" stroke="#d8eef8" strokeWidth="6" strokeLinecap="round" />
        </svg>
      ))}

      {/* Floating islands live only in the empty side margins of wide screens (content is max 72rem wide). */}
      {[
        { side: 'left-[2%] top-[42%]', w: 120, delay: '0s' },
        { side: 'right-[2%] top-[16%]', w: 140, delay: '-2s' },
      ].map((island, i) => (
        <svg key={i} className={`scene-float absolute hidden min-[1400px]:block ${island.side}`} width={island.w} viewBox="0 0 120 80" style={{ animationDelay: island.delay }}>
          <path d="M5 30h110l-15 14-40 34-40-34Z" fill="#a98466" />
          <ellipse cx="60" cy="30" rx="58" ry="12" fill="#8bc34a" />
          <rect x="34" y="12" width="6" height="16" fill="#8a5a3b" />
          <circle cx="37" cy="10" r="14" fill="#5e8c31" />
        </svg>
      ))}

      <svg className="absolute inset-x-0 bottom-0 h-[55%] w-full" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice">
        {/* hills */}
        <path d="M0 330C180 250 330 270 470 310s300 10 470-50 360-30 500 40V500H0Z" fill="#a6d672" />
        <path d="M0 390c160-50 330-40 480 0s340 30 520-20 300-20 440 20V500H0Z" fill="#8bc34a" />
        <path d="M0 445c220-30 420-20 640 10s480 10 800-15V500H0Z" fill="#5e8c31" />
        {/* path tiles */}
        <path d="M640 500c20-40 60-70 140-90 70-18 140-30 180-60" stroke="#f2b872" strokeWidth="42" strokeLinecap="round" fill="none" />
        <path d="M640 500c20-40 60-70 140-90 70-18 140-30 180-60" stroke="#d9894a" strokeWidth="42" strokeDasharray="2 38" fill="none" opacity="0.5" />
        {/* small trees */}
        {[
          [120, 395],
          [180, 410],
          [1240, 380],
          [1320, 400],
          [1380, 385],
        ].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 4} y={y - 6} width="8" height="22" rx="3" fill="#8a5a3b" />
            <circle cx={x} cy={y - 20} r="22" fill="#5e8c31" />
            <circle cx={x - 8} cy={y - 26} r="10" fill="#7cb342" />
          </g>
        ))}
      </svg>
    </div>
  )
}
