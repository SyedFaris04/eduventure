// Smoke test against a running room server: two signed-in players see each other join and move.
// Usage (from the repo root): start `npm run dev` in server/rooms, then `node server/rooms/smoke.mjs [ws://localhost:8787]`.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const base = process.argv[2] ?? 'ws://localhost:8787'
const room = `${base}/room/greenhaven/${40 + Math.floor(Math.random() * 9)}` // a quiet slot, away from real players

async function player(name) {
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await c.auth.signInAnonymously()
  if (error) throw error
  await c.rpc('set_birth_year', { p_year: 2000 })
  await c.from('characters').insert({ name, appearance: { body: 'regular', skin: '#f2c9a0', hair: 'short', hairColor: '#3b2a20', eyes: 'round', face: 'smile', top: 'scarf_red', bottom: 'shorts_brown', shoes: 'boots_brown', accessory: 'none', weapon: 'wooden_sword', backpack: 'none' } })
  return data.session.access_token
}

function connect(token) {
  const ws = new WebSocket(room)
  const inbox = []
  ws.onmessage = (e) => inbox.push(JSON.parse(e.data))
  return new Promise((resolve, reject) => {
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token }))
    ws.onerror = reject
    const wait = (t, ms = 5000) =>
      new Promise((ok, fail) => {
        const start = Date.now()
        const tick = () => {
          const i = inbox.findIndex((m) => m.t === t)
          if (i >= 0) return ok(inbox.splice(i, 1)[0])
          if (Date.now() - start > ms) return fail(new Error(`no ${t} within ${ms} ms; got ${JSON.stringify(inbox)}`))
          setTimeout(tick, 50)
        }
        tick()
      })
    wait('welcome').then((welcome) => resolve({ ws, wait, welcome }), reject)
  })
}

const [ta, tb] = [await player('Smoke Alpha'), await player('Smoke Beta')]
const a = await connect(ta)
const b = await connect(tb)
const joined = await a.wait('join')
if (joined.p.name !== 'Smoke Beta') throw new Error(`A saw ${JSON.stringify(joined)}`)
if (!b.welcome.players.some((p) => p.name === 'Smoke Alpha')) throw new Error(`B's welcome: ${JSON.stringify(b.welcome)}`)
a.ws.send(JSON.stringify({ t: 'move', x: 12.5, y: 7.25, battle: false }))
const moved = await b.wait('move')
if (moved.x !== 12.5 || moved.y !== 7.25) throw new Error(`B saw ${JSON.stringify(moved)}`)
a.ws.send(JSON.stringify({ t: 'emote', e: 'wave' }))
await b.wait('emote')
a.ws.close()
await b.wait('leave')
b.ws.close()
console.log('smoke ok')
process.exit(0)
