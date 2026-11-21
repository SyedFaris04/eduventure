// Renders the campaign videos with Remotion, copies each to every platform folder, then checks them with the FFmpeg
// and FFprobe that ship with Remotion: size, frame rate, codecs, duration, true peak (clipping) and black frames.
// Usage: node source/render-all.mjs [A B C D A-BM B-BM C-BM D-BM ...] [--check]   (none: all eight; --check: only check existing exports)
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const bin = `${root}node_modules/@remotion/compositor-win32-x64-msvc/`
// Remotion's own ffmpeg is a slim build; the checks use the full one from ffmpeg-static (blackdetect, ebur128).
const FULL_FFMPEG = `${root}node_modules/ffmpeg-static/ffmpeg.exe`
const VIDEOS = {
  A: { id: 'A-MainTrailer', file: 'eduventure-A-main-trailer', seconds: [35, 45] },
  B: { id: 'B-Learning', file: 'eduventure-B-learning', seconds: [20, 30] },
  C: { id: 'C-RPG', file: 'eduventure-C-rpg', seconds: [20, 30] },
  D: { id: 'D-Community', file: 'eduventure-D-community', seconds: [15, 25] },
  // Bahasa Melayu versions (Malay captions + Malay voice-over)
  'A-BM': { id: 'A-MainTrailer-BM', file: 'eduventure-A-main-trailer-BM', seconds: [35, 45] },
  'B-BM': { id: 'B-Learning-BM', file: 'eduventure-B-learning-BM', seconds: [20, 30] },
  'C-BM': { id: 'C-RPG-BM', file: 'eduventure-C-rpg-BM', seconds: [20, 30] },
  'D-BM': { id: 'D-Community-BM', file: 'eduventure-D-community-BM', seconds: [15, 25] },
}
const PLATFORMS = ['tiktok', 'instagram', 'youtube-shorts', 'threads']
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const letters = args.filter((a) => a in VIDEOS)
const wanted = letters.length ? letters : Object.keys(VIDEOS)

const report = []
for (const key of wanted) {
  const v = VIDEOS[key]
  const out = `${root}exports/tiktok/${v.file}.mp4`
  if (checkOnly) {
    report.push(check(key, v, out))
    continue
  }
  console.log(`\n=== Rendering ${v.id} → ${out}`)
  const r = spawnSync('npx', ['remotion', 'render', v.id, out, '--codec=h264', '--audio-codec=aac', '--crf=17', '--pixel-format=yuv420p', '--audio-bitrate=192k', '--color-space=bt709'], { cwd: root, stdio: 'inherit', shell: true })
  if (r.status !== 0) throw new Error(`render failed: ${v.id}`)
  for (const p of PLATFORMS.slice(1)) {
    mkdirSync(`${root}exports/${p}`, { recursive: true })
    copyFileSync(out, `${root}exports/${p}/${v.file}.mp4`)
  }
  report.push(check(key, v, out))
}

function check(key, v, file) {
  const probe = JSON.parse(execFileSync(`${bin}ffprobe.exe`, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString())
  const video = probe.streams.find((s) => s.codec_type === 'video')
  const audio = probe.streams.find((s) => s.codec_type === 'audio')
  const duration = Number(probe.format.duration)
  const [num, den] = video.r_frame_rate.split('/').map(Number)
  // Loudness and true peak (EBU R128), and black frames (blackdetect), in one pass of the full ffmpeg.
  const log = spawnSync(FULL_FFMPEG, ['-hide_banner', '-i', file, '-filter_complex', '[0:a]ebur128=peak=true[a];[0:v]blackdetect=d=0.1:pix_th=0.06[v]', '-map', '[a]', '-map', '[v]', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
  const summary = log.slice(log.lastIndexOf('Summary:'))
  const loud = { input_i: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]), input_tp: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]) }
  const black = [...log.matchAll(/black_start:([\d.]+)/g)].map((m) => ({ t: Number(m[1]) }))
  const checks = {
    'resolution 1080 × 1920': video.width === 1080 && video.height === 1920,
    'frame rate 30': num / den === 30,
    'H.264 video': video.codec_name === 'h264',
    'yuv420p (standard range)': video.pix_fmt === 'yuv420p',
    'AAC audio': audio?.codec_name === 'aac',
    [`duration ${v.seconds[0]}–${v.seconds[1]} s`]: duration >= v.seconds[0] && duration <= v.seconds[1],
    'no clipping (true peak ≤ −0.5 dBTP)': Number(loud.input_tp) <= -0.5,
    'no black frames': black.length === 0,
  }
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k)
  const line = { video: key, file, duration: duration.toFixed(2), loudnessLUFS: loud.input_i, truePeak: loud.input_tp, black: black.map((b) => b.t), sizeMB: (Number(probe.format.size) / 1e6).toFixed(1), failed }
  console.log(failed.length ? `✗ ${v.id}: ${failed.join(', ')}` : `✓ ${v.id}: all checks pass`, JSON.stringify(line))
  return line
}

writeFileSync(`${root}exports/check-report.json`, JSON.stringify(report, null, 2))
if (report.some((r) => r.failed.length)) process.exitCode = 1
