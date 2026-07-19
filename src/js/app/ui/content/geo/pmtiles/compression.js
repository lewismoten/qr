export async function decompressPmtiles(bytes, compression) {
  if (compression === 1) return bytes;
  if (compression !== 2) {
    throw new Error(`Unsupported PMTiles compression: ${compression}.`);
  }
  if (!globalThis.DecompressionStream) {
    throw new Error('This browser cannot decompress PMTiles gzip data.');
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
