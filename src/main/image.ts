import { unlink, writeFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import sharp from 'sharp'
import type { ImageFormat, ImageOptions } from '@shared/types'
import { aspectSize, baseName, nextFreePath } from '@shared/utils'

const MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  bmp: 'image/bmp'
}

/** Thrown when a job is aborted, so the queue reports 'canceled' not 'failed'. */
export class CanceledError extends Error {
  constructor(
    /** Output file left partially written, if the abort landed mid-encode. */
    readonly partialPath?: string
  ) {
    super('Canceled')
    this.name = 'CanceledError'
  }
}

function sourceBase(inputPath: string): string {
  return baseName(inputPath.split(/[\\/]/).pop() ?? 'image') || 'image'
}

function throwIfAborted(signal: AbortSignal, partialPath?: string): void {
  if (signal.aborted) throw new CanceledError(partialPath)
}

export async function convertImage(
  inputPath: string,
  outDir: string,
  opts: ImageOptions,
  onProgress: (p: number, phase: string) => void,
  signal: AbortSignal
): Promise<string> {
  throwIfAborted(signal)
  onProgress(0.05, 'Reading source')

  const outPath = nextFreePath(outDir, sourceBase(inputPath), opts.format, existsSync)

  let pipeline = sharp(inputPath, { failOn: 'none' })
  const meta = await pipeline.metadata()
  throwIfAborted(signal)

  const size = aspectSize(opts.aspect, meta.width, meta.height, opts.width, opts.height)

  if (opts.rotate) pipeline = pipeline.rotate(opts.rotate, { background: opts.background || '#00000000' })
  if (opts.flipH) pipeline = pipeline.flop()
  if (opts.flipV) pipeline = pipeline.flip()

  if (opts.fit === 'cover' || opts.fit === 'fill') {
    const { w, h } = size
    if (w && h) {
      pipeline = pipeline.resize({
        width: w,
        height: h,
        fit: opts.fit === 'cover' ? sharp.fit.cover : sharp.fit.fill
      })
    }
  } else if (size.w || size.h) {
    pipeline = pipeline.resize({
      width: size.w,
      height: size.h,
      fit: opts.fit === 'contain' ? sharp.fit.contain : sharp.fit.inside,
      withoutEnlargement: false,
      background: opts.background || '#00000000'
    })
  }

  if (opts.sharpen) pipeline = pipeline.sharpen({ sigma: 1 })

  if (opts.format === 'bmp') {
    onProgress(0.35, 'Encoding')
    const { data, info } = await pipeline.flatten({ background: '#ffffff' }).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true })
    throwIfAborted(signal)
    const stride = Math.ceil(info.width * 3 / 4) * 4
    const bitmap = Buffer.alloc(54 + stride * info.height)
    bitmap.write('BM')
    bitmap.writeUInt32LE(bitmap.length, 2)
    bitmap.writeUInt32LE(54, 10)
    bitmap.writeUInt32LE(40, 14)
    bitmap.writeInt32LE(info.width, 18)
    bitmap.writeInt32LE(-info.height, 22)
    bitmap.writeUInt16LE(1, 26)
    bitmap.writeUInt16LE(24, 28)
    bitmap.writeUInt32LE(stride * info.height, 34)
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const source = (y * info.width + x) * 3
        const target = 54 + y * stride + x * 3
        bitmap[target] = data[source + 2]
        bitmap[target + 1] = data[source + 1]
        bitmap[target + 2] = data[source]
      }
    }
    await writeFile(outPath, bitmap)
    if (signal.aborted) { await discardPartial(outPath); throw new CanceledError(outPath) }
    onProgress(1, 'Done')
    return outPath
  }

  const format = opts.format as ImageFormat
  const out = (pipeline as unknown as Record<string, (o: unknown) => InstanceType<typeof sharp>>)[format]({
    quality: Math.round(opts.quality),
    progressive: true
  })

  // sharp strips all metadata on write by default, so stripping needs no call.
  // Only preserve it when explicitly asked, and drop the EXIF orientation tag
  // because the pixel data has already been rotated/flipped.
  if (!opts.stripMetadata) {
    out.keepMetadata()
    if (opts.rotate || opts.flipH || opts.flipV) out.withMetadata({ orientation: undefined })
  }

  onProgress(0.35, 'Encoding')

  // sharp exposes no mid-encode abort hook, so the encode is raced against the
  // signal and any partial file is removed by the queue via partialPath.
  try {
    await Promise.race([out.toFile(outPath), abortPromise(signal, outPath)])
  } catch (err) {
    if (err instanceof CanceledError) await discardPartial(outPath)
    throw err
  }
  throwIfAborted(signal)
  onProgress(1, 'Done')
  return outPath
}

/** Rejects with CanceledError as soon as the signal aborts. */
function abortPromise(signal: AbortSignal, partialPath: string): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) return reject(new CanceledError(partialPath))
    signal.addEventListener('abort', () => reject(new CanceledError(partialPath)), { once: true })
  })
}

/** Remove a partially written output after a canceled encode. */
export async function discardPartial(path: string): Promise<void> {
  if (!path) return
  try {
    await unlink(path)
  } catch {
    /* nothing to clean up */
  }
}

export async function readImagePreview(path: string): Promise<string | null> {
  try {
    const buf = await sharp(path, { failOn: 'none' })
      .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78, progressive: true })
      .toBuffer()
    return `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function fileSize(path: string): Promise<number> {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

export { MIME as IMAGE_MIME }
