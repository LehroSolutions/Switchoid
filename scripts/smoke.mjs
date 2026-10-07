/**
 * Headless smoke test for the main-process conversion paths.
 *
 * Run with:  bun run scripts/smoke.mjs
 *
 * It exercises the real convertImage / convertVideo / convertAudio modules
 * (not copies) against generated samples, so encoding, progress, cancellation
 * and metadata behavior are verified without launching the Electron shell.
 */
import { mkdtempSync, mkdirSync, existsSync, statSync, rmSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import sharp from 'sharp'
import { convertImage, CanceledError } from '../src/main/image.ts'
import { convertVideo } from '../src/main/ffmpeg-video.ts'
import { convertAudio } from '../src/main/ffmpeg-audio.ts'
import { optionsForKind, optionsHandleKind } from '../src/shared/options.ts'
import { kindFromPath } from '../src/shared/utils.ts'
import { ffmpegStatus, ffmpegBin } from '../src/main/ffmpeg.ts'
import { mapConcurrent } from '../src/main/pool.ts'
import { readCachedPreview } from '../src/main/preview.ts'

const SAMPLES = process.env.SMOKE_SAMPLES ?? join(tmpdir(), 'switchoid-samples')
const out = mkdtempSync(join(tmpdir(), 'switchoid-out-'))
mkdirSync(SAMPLES, { recursive: true })

if ((await ffmpegStatus()).available) {
  const ff = (args) => execFileSync(ffmpegBin(), ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, timeout: 30000 })
  if (!existsSync(join(SAMPLES, 'sample.mp4'))) ff(['-f', 'lavfi', '-i', 'testsrc2=size=640x480:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', join(SAMPLES, 'sample.mp4')])
  if (!existsSync(join(SAMPLES, 'sample.mp3'))) ff(['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '3', join(SAMPLES, 'sample.mp3')])
  if (!existsSync(join(SAMPLES, 'sample.gif'))) ff(['-f', 'lavfi', '-i', 'testsrc2=size=480x360:rate=10', '-t', '2', join(SAMPLES, 'sample.gif')])
}

let pass = 0
let fail = 0
function check(name, ok, detail = '') {
  if (ok) {
    pass++
    console.log(`  PASS  ${name}${detail ? ` â€” ${detail}` : ''}`)
  } else {
    fail++
    console.log(`  FAIL  ${name}${detail ? ` â€” ${detail}` : ''}`)
  }
}
function size(p) {
  return existsSync(p) ? statSync(p).size : -1
}
const sig = () => new AbortController().signal
const noop = () => {}

async function outputStreams(path) {
  const { ffprobePath } = await ffmpegStatus()
  if (!ffprobePath) throw new Error('FFprobe is required to verify encoded outputs')
  return JSON.parse(execFileSync(ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', path], {
    windowsHide: true, encoding: 'utf8', timeout: 30000
  })).streams
}

function meta(path) {
  return {
    path,
    name: path.split(/[\\/]/).pop(),
    ext: path.split('.').pop(),
    kind: kindFromPath(path),
    size: 0,
    modifiedMs: 0,
    probe: null
  }
}

console.log(`samples: ${SAMPLES}`)
console.log(`output:  ${out}\n`)

// Surface unexpected failures in full; the console truncates the stack.
process.on('uncaughtException', (e) => {
  console.log(`\nUNCAUGHT: ${e?.stack ?? e}`)
  process.exit(1)
})
process.on('unhandledRejection', (e) => {
  console.log(`\nUNHANDLED: ${e?.stack ?? e}`)
  process.exit(1)
})

/* ------------------------------------------------------------------ images */
console.log('IMAGE')
{
  const src = join(SAMPLES, 'sample.png')
  if (!existsSync(src)) {
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#3366aa' }
    })
      .png()
      .toFile(src)
    console.log('  (generated sample.png)')
  }

  // 1. Basic format conversion + progress reporting.
  {
    const phases = []
    const p = await convertImage(
      src,
      out,
      { ...optionsForKind('image'), format: 'webp' },
      (n, phase) => phases.push(phase),
      sig()
    )
    check('png â†’ webp produces a file', size(p) > 0, `${size(p)} bytes`)
    const m = await sharp(p).metadata()
    check(
      'webp dimensions preserved',
      m.width === 1200 && m.height === 800,
      `${m.width}x${m.height}`
    )
    check('progress phases emitted', phases.length >= 2, phases.join(' â†’ '))
  }

  {
    const p = await convertImage(src, out, { ...optionsForKind('image'), format: 'bmp', width: 514 }, noop, sig())
    const bytes = readFileSync(p)
    const width = bytes.readInt32LE(18)
    const height = Math.abs(bytes.readInt32LE(22))
    check('BMP has a valid bitmap header', bytes.toString('ascii', 0, 2) === 'BM' && bytes.readUInt32LE(2) === bytes.length)
    check('BMP preserves padded rows and requested size', width === 514 && bytes.length === 54 + Math.ceil(width * 3 / 4) * 4 * height)
    check('BMP stores RGB source pixels as BGR', bytes[54] === 170 && bytes[55] === 102 && bytes[56] === 51)
    if ((await ffmpegStatus()).available) {
      const decoded = join(out, 'bmp-decoded.png')
      execFileSync(ffmpegBin(), ['-hide_banner', '-loglevel', 'error', '-i', p, decoded], { windowsHide: true })
      const decodedMeta = await sharp(decoded).metadata()
      check('BMP output decodes in FFmpeg', decodedMeta.width === width && decodedMeta.height === height)
    }
  }

  // 2. Resize to a fixed aspect with cover crop.
  {
    const p = await convertImage(
      src,
      out,
      {
        ...optionsForKind('image'),
        format: 'png',
        aspect: '1:1',
        width: 512,
        height: 512,
        fit: 'cover'
      },
      noop,
      sig()
    )
    const m = await sharp(p).metadata()
    check('1:1 cover crop is square', m.width === 512 && m.height === 512, `${m.width}x${m.height}`)
  }

  // 3. Metadata stripping vs preservation.
  {
    const tagged = join(out, 'tagged.png')
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#ff0000' }
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'switchoid-test' } } })
      .png()
      .toFile(tagged)

    const stripped = await convertImage(
      tagged,
      out,
      { ...optionsForKind('image'), format: 'png', stripMetadata: true },
      noop,
      sig()
    )
    const kept = await convertImage(
      tagged,
      out,
      { ...optionsForKind('image'), format: 'png', stripMetadata: false },
      noop,
      sig()
    )
    check(
      'stripMetadata true removes EXIF',
      !readFileSync(stripped).includes(Buffer.from('switchoid-test'))
    )
    check(
      'stripMetadata false preserves EXIF',
      readFileSync(kept).includes(Buffer.from('switchoid-test'))
    )
  }

  // 4. Collision avoidance.
  {
    const opts = { ...optionsForKind('image'), format: 'jpeg' }
    const a = await convertImage(src, out, opts, noop, sig())
    const b = await convertImage(src, out, opts, noop, sig())
    check('repeat conversion does not overwrite', a !== b && size(b) > 0, b.split('\\').pop())
  }

  // 5. Cancellation.
  {
    const pre = new AbortController()
    pre.abort()
    let threw = null
    try {
      await convertImage(src, out, optionsForKind('image'), noop, pre.signal)
    } catch (e) {
      threw = e
    }
    check('pre-aborted job throws CanceledError', threw instanceof CanceledError, threw?.name)
  }
  {
    // An abort that lands while sharp is writing must not leave a truncated
    // file on disk. The source is large so the encode is actually in flight.
    const sub = mkdtempSync(join(tmpdir(), 'switchoid-cancel-'))
    const big = join(sub, 'big.png')
    await sharp({
      create: { width: 6000, height: 4000, channels: 3, background: '#22aa55' }
    })
      .png()
      .toFile(big)

    const c = new AbortController()
    const expected = join(sub, 'big.webp')
    let partial = existsSync(expected)
    try {
      await Promise.race([
        convertImage(big, sub, { ...optionsForKind('image'), format: 'webp' }, noop, c.signal),
        // Cancel while the encode is in flight.
        new Promise((r) => setTimeout(() => (c.abort(), r()), 5))
      ])
    } catch {
      /* cancel is the expected outcome */
    }
    // Give any in-flight write a moment to land before asserting.
    await new Promise((r) => setTimeout(r, 250))
    partial = existsSync(expected)
    check('canceled image conversion leaves no partial file', !partial)
    rmSync(sub, { recursive: true, force: true })
  }
}

/* ------------------------------------------------------------------- video */
console.log('\nVIDEO')
{
  const status = await ffmpegStatus()
  const src = join(SAMPLES, 'sample.mp4')

  if (!status.available) {
    console.log(`  SKIP  ffmpeg unavailable: ${status.error}`)
  } else if (!existsSync(src)) {
    console.log('  SKIP  sample.mp4 missing')
  } else {
    const m = meta(src)
    m.probe = { durationSec: 3, width: 640, height: 480, hasAudio: true, hasVideo: true }

    for (const [format, videoCodec, audioCodec] of [['mov', 'h264', 'aac'], ['mkv', 'h264', 'aac'], ['avi', 'mpeg4', 'mp3']]) {
      const r = await convertVideo(src, out, { ...optionsForKind('video'), format }, m, noop, sig())
      const streams = await outputStreams(r.outPath)
      check(`mp4 to ${format} contains video and audio`,
        streams.some(stream => stream.codec_type === 'video' && stream.codec_name === videoCodec) &&
        streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === audioCodec))
    }

    {
      const seen = []
      const r = await convertVideo(
        src,
        out,
        { ...optionsForKind('video'), format: 'webm' },
        m,
        (p) => seen.push(p),
        sig()
      )
      check('mp4 â†’ webm', size(r.outPath) > 0, `${size(r.outPath)} bytes`)
      check('progress reaches 1.0', seen.at(-1) === 1, `last=${seen.at(-1)}`)
    }

    {
      const r = await convertVideo(
        src,
        out,
        { ...optionsForKind('gif'), format: 'gif' },
        m,
        noop,
        sig()
      )
      const head = readFileSync(r.outPath).subarray(0, 6).toString('latin1')
      check('video â†’ gif writes a GIF', head.startsWith('GIF8'), head)
    }

    {
      const g = join(SAMPLES, 'sample.gif')
      if (existsSync(g)) {
        const gm = meta(g)
        gm.probe = { durationSec: 2, width: 480, height: 360, hasVideo: true, hasAudio: false }
        const r = await convertVideo(
          g,
          out,
          { ...optionsForKind('video'), format: 'mp4' },
          gm,
          noop,
          sig()
        )
        check('gif â†’ mp4', size(r.outPath) > 0, `${size(r.outPath)} bytes`)
      }
    }

    {
      const c = new AbortController()
      setTimeout(() => c.abort(), 120)
      let msg = null
      try {
        await convertVideo(
          src,
          out,
          { ...optionsForKind('video'), format: 'webm' },
          m,
          noop,
          c.signal
        )
      } catch (e) {
        msg = e.message
      }
      check('video cancel reports Canceled', msg === 'Canceled', msg ?? 'no error thrown')
    }
  }
}

/* ------------------------------------------------------------------- audio */
console.log('\nAUDIO')
{
  const status = await ffmpegStatus()
  const asrc = join(SAMPLES, 'sample.mp3')
  if (!status.available) {
    console.log('  SKIP  ffmpeg unavailable')
  } else if (!existsSync(asrc)) {
    console.log('  SKIP  sample.mp3 missing')
  } else {
    const am = meta(asrc)
    am.probe = { durationSec: 3, hasAudio: true, hasVideo: false }
    for (const [fmt, codec] of [['mp3', 'mp3'], ['wav', 'pcm_s16le'], ['flac', 'flac'], ['ogg', 'vorbis'], ['aac', 'aac'], ['m4a', 'aac'], ['opus', 'opus']]) {
      const r = await convertAudio(
        asrc,
        out,
        { ...optionsForKind('audio'), format: fmt },
        am,
        noop,
        sig()
      )
      const streams = await outputStreams(r.outPath)
      check(`mp3 to ${fmt}`, size(r.outPath) > 0 && streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === codec &&
        (fmt !== 'opus' || Number(stream.sample_rate) === 48000)), `${size(r.outPath)} bytes`)
    }
  }
}

/* ---------------------------------------------------- mixed-kind fallback */
console.log('\nOPTIONS ROUTING')
{
  check('image opts do not handle video', !optionsHandleKind('image', 'video'))
  check('video opts handle gif', optionsHandleKind('video', 'gif'))
  check('gif opts handle video', optionsHandleKind('gif', 'video'))
  check('gif opts do not handle audio', !optionsHandleKind('gif', 'audio'))
  const img = optionsForKind('image')
  check('image defaults tagged', img.kind === 'image' && img.format === 'webp')
  const aud = optionsForKind('audio')
  check('audio defaults tagged', aud.kind === 'audio' && aud.format === 'mp3')
  const gif = optionsForKind('gif')
  check('gif defaults mute audio', gif.kind === 'gif' && gif.mute === true)
}

console.log('\nRESOURCE LIMITS')
{
  let active = 0
  let peak = 0
  const result = await mapConcurrent(Array.from({ length: 21 }, (_, i) => i), 4, async i => {
    peak = Math.max(peak, ++active)
    await new Promise(r => setTimeout(r, (21 - i) % 5))
    active--
    return i * 2
  })
  check('metadata workers bounded to four', peak === 4)
  check('metadata results preserve file order', result.every((v, i) => v === i * 2))
  const source = join(out, 'preview-cache.png')
  await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ff0000' } }).png().toFile(source)
  const [a, b] = await Promise.all([readCachedPreview(source), readCachedPreview(source)])
  check('concurrent preview reads agree', Boolean(a) && a === b)
  const metadata = await sharp(Buffer.from(a.split(',')[1], 'base64')).metadata()
  check('preview decode limited to 320 pixels', metadata.width === 320 && metadata.height === 240)
  await sharp({ create: { width: 900, height: 600, channels: 3, background: '#0000ff' } }).png().toFile(source)
  const changed = await readCachedPreview(source)
  check('preview invalidated when source changes', changed !== a)
  check('missing preview returns null', await readCachedPreview(join(out, 'absent.png')) === null)
}

console.log(`\n${pass} passed, ${fail} failed`)
try {
  rmSync(out, { recursive: true, force: true })
} catch {}
process.exit(fail ? 1 : 0)
