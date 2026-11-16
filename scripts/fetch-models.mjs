// Downloads the CC0 KayKit models the 3D world uses and writes trimmed GLBs to public/assets/models/.
// Run with `npm run fetch:models`; the output is committed, so this only runs when the list changes.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join, posix } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, resample, weld } from '@gltf-transform/functions'

const RAW = 'https://raw.githubusercontent.com/KayKit-Game-Assets'
const CACHE = '.cache/kaykit'
const OUT = 'public/assets/models'
const ADV = 'KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures'
const HEX = 'KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf'

const RIG_CLIPS = ['Idle', 'Walking_A', 'Running_A', 'Cheer', 'Hit_A', 'Interact', '1H_Melee_Attack_Chop', 'Jump_Full_Short']
const PROPS = {
  tree_a: 'decoration/nature/tree_single_A.gltf',
  tree_b: 'decoration/nature/tree_single_B.gltf',
  rock_a: 'decoration/nature/rock_single_A.gltf',
  rock_b: 'decoration/nature/rock_single_B.gltf',
  rock_c: 'decoration/nature/rock_single_C.gltf',
  house_a: 'buildings/green/building_home_A_green.gltf',
  house_b: 'buildings/green/building_home_B_green.gltf',
  well: 'buildings/blue/building_well_blue.gltf',
  fence: 'buildings/neutral/fence_wood_straight.gltf',
}

async function download(remote) {
  const local = join(CACHE, remote)
  try {
    return await readFile(local)
  } catch {
    const res = await fetch(`${RAW}/${remote}`)
    if (!res.ok) throw new Error(`${res.status} ${remote}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await mkdir(dirname(local), { recursive: true })
    await writeFile(local, buf)
    return buf
  }
}

/** A .gltf plus every buffer and image it points at. */
async function downloadGltf(remote) {
  const json = JSON.parse((await download(remote)).toString('utf8'))
  const uris = [...(json.buffers ?? []), ...(json.images ?? [])].map((x) => x.uri).filter((u) => u && !u.startsWith('data:'))
  for (const u of uris) await download(posix.join(posix.dirname(remote), u))
  return join(CACHE, remote)
}

const io = new NodeIO()
await mkdir(OUT, { recursive: true })

// The rig: the Knight's skeleton and a few clips, without any of its meshes (our hero parts go on the bones).
await download(`${ADV}/Characters/gltf/Knight.glb`)
const rig = await io.read(join(CACHE, ADV, 'Characters/gltf/Knight.glb'))
for (const n of rig.getRoot().listNodes()) if (n.getMesh()) n.dispose()
for (const m of rig.getRoot().listMeshes()) m.dispose()
for (const a of rig.getRoot().listAnimations()) {
  if (RIG_CLIPS.includes(a.getName())) continue
  // Disposing a clip leaves its keyframe data behind, so remove that explicitly.
  for (const s of a.listSamplers()) s.dispose() // prune() then drops keyframe data no kept clip shares
  for (const c of a.listChannels()) c.dispose()
  a.dispose()
}
await rig.transform(resample(), prune({ keepLeaves: true }), dedup(), prune({ keepLeaves: true }))
await io.write(join(OUT, 'rig.glb'), rig)

for (const [name, path] of Object.entries(PROPS)) {
  const doc = await io.read(await downloadGltf(`${HEX}/${path}`))
  await doc.transform(prune(), dedup(), weld())
  await io.write(join(OUT, `${name}.glb`), doc)
}
console.log('models written to', OUT)
