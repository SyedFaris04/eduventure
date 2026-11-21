// Generates the Malay voice-over with Azure AI Speech (voice ms-MY-OsmanNeural, a Malaysian man).
// Key: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION, from the environment or marketing/eduventure-campaign/.env.local
// (git-ignored, never committed). Writes assets/audio/vo/ms/<video>-<nn>.mp3 and fills in source/voiceover/ms.json
// (file, seconds, rateUsed). Set 'rate' on a line to force a speed. A line that would run into the next one is re-read faster, up to +20%.
// Usage: node source/voiceover/tts.mjs [A B C D] [--measure]
// --measure: no Azure call; measures recordings already in assets/audio/vo/ms/ (for example a real person's, saved
// under the same names) and fills in ms.json, so the videos use them.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const key = env('AZURE_SPEECH_KEY')
const region = env('AZURE_SPEECH_REGION')
if (!measureOnly && (!key || !region)) {
  console.error('Missing AZURE_SPEECH_KEY / AZURE_SPEECH_REGION (put them in marketing/eduventure-campaign/.env.local).')
  process.exit(1)
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
async function speak(text, voice, rate, out) {
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
  return Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString())
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'))
mkdirSync(outDir, { recursive: true })
const letters = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const wanted = letters.length ? letters : ['A', 'B', 'C', 'D']
const problems = []
for (const v of wanted) {
  const lines = data[v]
  for (const [i, line] of lines.entries()) {
    const name = `${v}-${String(i + 1).padStart(2, '0')}.mp3`
    const end = (i + 1 < lines.length ? lines[i + 1].at : TOTAL[v]) / 30 - 0.15 // seconds; a small gap before the next line
    const room = end - line.at / 30
    let rate = line.rate ?? '+0%'
    if (measureOnly) {
      if (!existsSync(outDir + name)) { console.log(`- ${name} missing`); continue }
      const seconds = Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outDir + name]).toString())
      Object.assign(line, { file: `audio/vo/ms/${name}`, seconds: Math.round(seconds * 100) / 100 })
      if (seconds > room) problems.push(`${v} line ${i + 1} is ${seconds.toFixed(2)} s but has ${room.toFixed(2)} s`)
      console.log(`${seconds <= room ? '✓' : '✗'} ${name}  ${seconds.toFixed(2)} s / ${room.toFixed(2)} s`)
      continue
    }
    let seconds = await speak(line.text, data.voice, rate, outDir + name)
    // Too long for its slot: read it a little faster, in 5% steps, up to +20%.
    for (let pct = 5; seconds > room && pct <= 20 && !line.rate; pct += 5) {
      rate = `+${pct}%`
      seconds = await speak(line.text, data.voice, rate, outDir + name)
    }
    Object.assign(line, { file: `audio/vo/ms/${name}`, seconds: Math.round(seconds * 100) / 100, rateUsed: rate })
    const fits = seconds <= room
    if (!fits) problems.push(`${v} line ${i + 1} is ${seconds.toFixed(2)} s but has ${room.toFixed(2)} s: shorten the text or move 'at'`)
    console.log(`${fits ? '✓' : '✗'} ${name}  ${seconds.toFixed(2)} s / ${room.toFixed(2)} s  ${rate}  ${line.text}`)
  }
}
writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n')
if (problems.length) {
  console.log('\nLines that do not fit:\n' + problems.join('\n'))
  process.exitCode = 1
} else console.log('\nAll lines fit their shots.')
