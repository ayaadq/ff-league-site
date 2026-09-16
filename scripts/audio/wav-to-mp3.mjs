/** Encodes the crowd audio `make-crowd.py` writes (16-bit PCM WAV) down to
 * MP3, so `public/audio/ambience.mp3` and `roar.mp3` stay in the same size
 * class as the site's other audio assets (click/whoosh) instead of shipping
 * raw PCM. Uncompressed, the crowd files run ~2-4 MB; MP3 at 112kbps brings
 * that back down to roughly what was there before (under 200 KB each).
 *
 * Not a project dependency: `@breezystack/lamejs` is installed on demand,
 * not in package.json, since nothing else in the app needs an MP3 encoder.
 * Note the package name -- the plain `lamejs` on npm throws
 * `ReferenceError: MPEGMode is not defined` under Node's ESM loader; this
 * fork fixes that and is otherwise the same encoder.
 *
 * Usage (from the repo root):
 *   npm install --no-save @breezystack/lamejs
 *   python scripts/audio/make-crowd.py <some-dir>   # writes ambience.wav, roar.wav
 *   node scripts/audio/wav-to-mp3.mjs <some-dir>     # writes ambience.mp3, roar.mp3 alongside them
 *   cp <some-dir>/{ambience,roar}.mp3 public/audio/
 *
 * An optional second argument writes the .mp3 files to a different
 * directory than the .wav files were read from. */

import fs from 'node:fs'
import path from 'node:path'
import lamejs from '@breezystack/lamejs'

const BITRATE_KBPS = 112

function readWav(filePath) {
  const buf = fs.readFileSync(filePath)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${filePath} is not a RIFF/WAVE file`)
  }
  let offset = 12
  let fmt = null
  let dataOffset = -1
  let dataLength = 0
  while (offset < buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4)
    const chunkSize = buf.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(chunkStart),
        numChannels: buf.readUInt16LE(chunkStart + 2),
        sampleRate: buf.readUInt32LE(chunkStart + 4),
        bitsPerSample: buf.readUInt16LE(chunkStart + 14),
      }
    } else if (chunkId === 'data') {
      dataOffset = chunkStart
      dataLength = chunkSize
    }
    offset = chunkStart + chunkSize + (chunkSize % 2)
  }
  if (!fmt || dataOffset < 0) throw new Error(`${filePath}: missing fmt/data chunk`)
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(
      `${filePath}: expected 16-bit PCM, got format ${fmt.audioFormat}/${fmt.bitsPerSample}bit`,
    )
  }
  const sampleCount = dataLength / 2 / fmt.numChannels
  const channels = Array.from({ length: fmt.numChannels }, () => new Int16Array(sampleCount))
  for (let i = 0; i < sampleCount; i++) {
    for (let ch = 0; ch < fmt.numChannels; ch++) {
      channels[ch][i] = buf.readInt16LE(dataOffset + (i * fmt.numChannels + ch) * 2)
    }
  }
  return { sampleRate: fmt.sampleRate, numChannels: fmt.numChannels, channels }
}

function encodeMp3(wav, kbps) {
  const encoder = new lamejs.Mp3Encoder(wav.numChannels, wav.sampleRate, kbps)
  const blockSize = 1152
  const mp3Data = []
  const [left, right] = wav.channels
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize)
    const rightChunk = right ? right.subarray(i, i + blockSize) : undefined
    const mp3buf = right
      ? encoder.encodeBuffer(leftChunk, rightChunk)
      : encoder.encodeBuffer(leftChunk)
    if (mp3buf.length > 0) mp3Data.push(Buffer.from(mp3buf))
  }
  const end = encoder.flush()
  if (end.length > 0) mp3Data.push(Buffer.from(end))
  return Buffer.concat(mp3Data)
}

const [inDir, outDir = inDir] = process.argv.slice(2)
if (!inDir) {
  console.error('Usage: node scripts/audio/wav-to-mp3.mjs <wav-dir> [mp3-out-dir]')
  process.exit(1)
}

for (const name of ['ambience', 'roar']) {
  const wav = readWav(path.join(inDir, `${name}.wav`))
  const mp3 = encodeMp3(wav, BITRATE_KBPS)
  const outPath = path.join(outDir, `${name}.mp3`)
  fs.writeFileSync(outPath, mp3)
  const seconds = wav.channels[0].length / wav.sampleRate
  console.log(
    `${name}: ${seconds.toFixed(1)}s -> ${outPath} (${(mp3.length / 1024).toFixed(0)} KB)`,
  )
}
