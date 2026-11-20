// Still pictures for devices without 3D (or that ask for less motion), drawn in code.
export type PetStage = 'egg' | 'baby' | 'young' | 'adult'
const PET_SIZE: Record<PetStage, number> = { egg: 96, baby: 110, young: 140, adult: 170 }

/** The green Sproutling; flinches (CSS) each time it is hit. */
export function MonsterStill({ hits, label }: { hits: number; label: string }) {
  return (
    <div className="grid h-56 place-items-center">
      <div key={hits} role="img" aria-label={label} className={`relative size-32 rounded-[45%_45%_40%_40%] border-4 border-[#3f7d2a] bg-gradient-to-b from-[#b5e48c] to-[#76c043] ${hits > 0 ? 'hit' : ''}`}>
        <span className="absolute top-10 left-8 size-4 rounded-full bg-ink" />
        <span className="absolute top-10 right-8 size-4 rounded-full bg-ink" />
        <span className="absolute -top-6 left-1/2 h-8 w-2 -translate-x-1/2 rounded-full bg-[#3f7d2a]" />
        <span className="absolute -top-8 left-1/2 h-4 w-8 rounded-full bg-[#76c043]" />
      </div>
    </div>
  )
}

/** The knowledge pet: an egg, then a round friend that grows each stage. */
export function PetStill({ stage, label }: { stage: PetStage; label: string }) {
  const size = PET_SIZE[stage]
  return (
    <div className="grid h-56 place-items-center">
      <div
        key={stage}
        role="img"
        aria-label={label}
        style={{ width: `${size}px`, height: `${stage === 'egg' ? size * 1.25 : size}px` }}
        className={`pop relative border-4 border-wood-dark ${stage === 'egg' ? 'rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[repeating-linear-gradient(135deg,#fff6e3_0_14px,#f7c843_14px_20px)]' : 'rounded-full bg-gradient-to-b from-[#ffe08a] to-[#f2b872]'}`}
      >
        {stage !== 'egg' && (
          <>
            <span className="absolute top-[38%] left-[28%] size-3 rounded-full bg-ink" />
            <span className="absolute top-[38%] right-[28%] size-3 rounded-full bg-ink" />
            <span className="absolute top-[55%] left-1/2 h-2 w-6 -translate-x-1/2 rounded-b-full bg-danger" />
          </>
        )}
      </div>
    </div>
  )
}
