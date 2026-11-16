/** The parts of a glTF JSON chunk the tests read. */
export type GltfJson = {
  nodes: { name?: string; mesh?: number; children?: number[] }[]
  meshes?: unknown[]
  animations?: { name: string }[]
}

/** Reads the JSON chunk of a binary glTF (header 12 bytes, then chunk length + type). */
export function readGlbJson(buf: Uint8Array): GltfJson {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB file')
  const len = view.getUint32(12, true)
  return JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + len))) as GltfJson
}
