/**
 * Calm generative music: a soft pad, a sparse plucked melody and a quiet bass, all on a major pentatonic scale, so
 * any two notes sound fine together. Each mood changes the key, tempo and timbre. Pure and seedable for tests.
 */
export type Mood = 'study' | 'kampung' | 'rainforest' | 'alpine' | 'tech' | 'kingdom' | 'cozy'
export type Voice = 'pad' | 'lead' | 'bass'
export type Note = { voice: Voice; midi: number; at: number; dur: number } // at and dur in beats within a 4-beat bar

const PENTATONIC = [0, 2, 4, 7, 9]
// Chords built only from scale notes (I, vi, ii-ish, V-ish), so the pad never clashes with the melody.
const CHORDS = [
  [0, 4, 7],
  [9, 0, 4],
  [2, 7, 9],
  [7, 2, 4],
]

export const MOODS: Record<Mood, { root: number; bpm: number; scale: number[]; lead: OscillatorType; busy: number }> = {
  study: { root: 60, bpm: 64, scale: PENTATONIC, lead: 'sine', busy: 0.3 }, // Home and lessons: the calmest
  kampung: { root: 62, bpm: 76, scale: PENTATONIC, lead: 'triangle', busy: 0.45 }, // Greenhaven
  rainforest: { root: 65, bpm: 70, scale: PENTATONIC, lead: 'sine', busy: 0.4 }, // Science Island
  alpine: { root: 67, bpm: 72, scale: PENTATONIC, lead: 'triangle', busy: 0.4 }, // Mathematics Mountains: music box
  tech: { root: 57, bpm: 80, scale: PENTATONIC, lead: 'triangle', busy: 0.55 }, // Technology City: soft arpeggios
  kingdom: { root: 64, bpm: 74, scale: PENTATONIC, lead: 'sine', busy: 0.45 }, // Language Kingdom: harp-like
  cozy: { root: 62, bpm: 68, scale: PENTATONIC, lead: 'sine', busy: 0.35 }, // My island: unhurried, homely
}

export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** One 4-beat bar of a mood. `rng` returns 0..1 (Math.random in the game, seeded in tests). */
export function barNotes(mood: Mood, bar: number, rng: () => number): Note[] {
  const m = MOODS[mood]
  const chord = CHORDS[bar % CHORDS.length]
  const notes: Note[] = chord.map((pc) => ({ voice: 'pad', midi: m.root - 12 + pc, at: 0, dur: 4 }))
  notes.push({ voice: 'bass', midi: m.root - 24 + chord[0], at: 0, dur: 2 }, { voice: 'bass', midi: m.root - 24 + chord[0], at: 2, dur: 2 })

  // Melody: a gentle random walk over a degree and a half of scale steps, mostly on half-beats.
  const leadBase = m.root < 60 ? m.root + 12 : m.root
  const steps = m.scale.length
  let degree = Math.floor(rng() * steps) + steps // start in the upper octave
  const leads: Note[] = []
  for (let slot = 0; slot < 8; slot++) {
    if (rng() > m.busy && !(slot === 0 && bar % 2 === 0)) continue
    degree = Math.max(0, Math.min(steps + 3, degree + Math.round((rng() - 0.5) * 3)))
    const midi = leadBase + Math.floor(degree / steps) * 12 + m.scale[degree % steps]
    leads.push({ voice: 'lead', midi, at: slot / 2, dur: 1 + rng() })
  }
  if (leads.length < 2) leads.push({ voice: 'lead', midi: leadBase + m.scale[2], at: 2, dur: 1.5 }, { voice: 'lead', midi: leadBase + 12, at: 3, dur: 1 })
  return [...notes, ...leads]
}
