// Generates the Malay voice-over with Azure AI Speech (voice ms-MY-OsmanNeural, a Malaysian man).
// Key: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION, from the environment or marketing/eduventure-campaign/.env.local
// (git-ignored, never committed). Writes assets/audio/vo/ms/<video>-<nn>.mp3 and fills in source/voiceover/ms.json
// (file, seconds, start, rateUsed). Silence is trimmed; a line starts at 'at' or right after the line before. Set
// 'rate' on a line to force a speed; otherwise +5%, or +10% if the video's lines run past its end.
// Usage: node source/voiceover/tts.mjs [A B C D] [--edge] [--measure]
// --edge: no Azure account; uses Microsoft Edge's free read-aloud service through edge-tts (same Osman voice), from
// marketing/eduventure-campaign/.venv (python -m venv .venv && .venv/Scripts/python -m pip install edge-tts).
// Unofficial: its terms don't clearly cover adverts, so prefer Azure once that works.
// --measure: no Azure call; measures recordings already in assets/audio/vo/ms/ (for example a real person's, saved
// under the same names) and fills in ms.json, so the videos use them.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dataPath = `${root}source/voiceover/ms.json`
const outDir = `${root}assets/audio/vo/ms/`
const FFPROBE = `${root}node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe`
const TOTAL = { A: 1290, B: 750, C: 750, D: 600 } // composition lengths in frames (30 fps)

function env(name) {
  if (process.env[name]) return process.env[name]
  const file = `${root}.env.local`
  if (!existsSync(file)) return ''
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`))
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : ''
}
const measureOnly = process.argv.includes('--measure')
const useEdge = process.argv.includes('--edge')
const EDGE_TTS = `${root}.venv/Scripts/edge-tts.exe`
const key = env('AZURE_SPEECH_KEY')
const region = env('AZURE_SPEECH_REGION')
if (!measureOnly && !useEdge && (!key || !region)) {
  console.error('Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION (put them in marketing/eduventure-campaign/.env.local).')
  process.exit(1)
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const duration = (out) => Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString())
async function speak(text, voice, rate, out) {
  if (useEdge) {
    execFileSync(EDGE_TTS, ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', out], { stdio: ['ignore', 'ignore', 'pipe'] })
    return
  }
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ms-MY"><voice name="${voice}"><prosody rate="${rate}">${xml(text)}</prosody></voice></speak>`
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
      'User-Agent': 'eduventure-campaign',
    },
    body: ssml,
  })
  if (!r.ok) throw new Error(`Azure TTS ${r.status}: ${(await r.text()).slice(0, 200)}`)
  writeFileSync(out, Buffer.from(await r.arrayBuffer()))
}

const FULL_FFMPEG = `${root}node_modules/ffmpeg-static/ffmpeg.exe`
/** Cuts the silence the voice service leaves before and after a line (keeps 40 ms either side). */
function trim(file) {
  const tmp = file.replace(/\.mp3$/, '.tmp.mp3')
  execFileSync(FULL_FFMPEG, ['-v', 'error', '-y', '-i', file, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse', '-c:a', 'libmp3lame', '-b:a', '128k', tmp])
  renameSync(tmp, file)
  // Level every line to -16 LUFS so the voice sits clearly above the ducked music on phone speakers.
  const meas = spawnSync(FULL_FFMPEG, ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(meas.slice(meas.lastIndexOf('Summary:')))?.[1])
  if (Number.isFinite(lufs)) {
    execFileSync(FULL_FFMPEG, ['-v', 'error', '-y', '-i', file, '-af', `volume=${(-16 - lufs).toFixed(2)}dB,alimiter=limit=0.89`, '-c:a', 'libmp3lame', '-b:a', '128k', tmp])
    renameSync(tmp, file)
  }
  return duration(file)
}

/**
 * Places the lines: each starts at its planned frame ('at') or, if the line before is still speaking, 5 frames after
 * it ends. Returns the frame where the last line ends.
 */
function schedule(lines) {
  let free = 0
  for (const l of lines) {
    l.start = Math.max(l.at, free)
    free = l.start + Math.ceil(l.seconds * 30) + 5
  }
  return free - 5
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'))
mkdirSync(outDir, { recursive: true })
const letters = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const wanted = letters.length ? letters : ['A', 'B', 'C', 'D']
const problems = []
for (const v of wanted) {
  const lines = data[v]
  const limit = TOTAL[v] - 12 // the voice ends at least 0.4 s before the video does
  // A brisk trailer read (+5%); if the lines still run past the end, read the whole video at +10%. Never faster.
  for (const rate of ['+5%', '+10%']) {
    for (const [i, line] of lines.entries()) {
      const name = `${v}-${String(i + 1).padStart(2, '0')}.mp3`
      if (measureOnly) {
        if (!existsSync(outDir + name)) continue
      } else await speak(line.text, data.voice, line.rate ?? rate, outDir + name)
      const seconds = measureOnly ? duration(outDir + name) : trim(outDir + name)
      Object.assign(line, { file: `audio/vo/ms/${name}`, seconds: Math.round(seconds * 100) / 100, rateUsed: measureOnly ? undefined : line.rate ?? rate })
    }
    if (schedule(lines) <= limit || measureOnly) break
  }
  const end = schedule(lines)
  for (const [i, l] of lines.entries()) {
    const late = l.start - l.at
    console.log(`${v}-${String(i + 1).padStart(2, '0')}  at ${(l.start / 30).toFixed(2)} s${late ? ` (+${(late / 30).toFixed(2)} s late)` : ''}  ${l.seconds.toFixed(2)} s  ${l.rateUsed ?? ''}  ${l.text}`)
  }
  const ok = end <= limit
  console.log(`${ok ? '✓' : '✗'} ${v}: the voice ends at ${(end / 30).toFixed(2)} s of ${(TOTAL[v] / 30).toFixed(2)} s\n`)
  if (!ok) problems.push(`${v}: the voice runs ${((end - limit) / 30).toFixed(2)} s too long — shorten some lines`)
}
writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n')
if (problems.length) {
  console.log('Too long:\n' + problems.join('\n'))
  process.exitCode = 1
} else console.log('All voice lines fit their videos.')
