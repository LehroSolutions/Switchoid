import { existsSync } from 'node:fs'
import { runFfmpeg, crfFromQuality } from './ffmpeg-run'
import type { MediaFileMeta, VideoOptions } from '@shared/types'
import { aspectSize, baseName, nextFreePath } from '@shared/utils'

export interface RunResult {
  outPath: string
}

type Progress = (p: number, phase: string) => void

/**
 * Audio codecs each container can actually carry. Requesting a codec the
 * muxer rejects fails the whole encode, so the user's audio choice is coerced
 * to the nearest legal one instead of erroring out.
 */
const CONTAINER_AUDIO: Record<string, Set<string>> = {
  webm: new Set(['opus', 'libvorbis']),
  avi: new Set(['mp3', 'ac3', 'pcm_s16le']),
  mp4: new Set(['aac', 'opus', 'mp3']),
  mov: new Set(['aac', 'mp3', 'pcm_s16le']),
  mkv: new Set(['aac', 'opus', 'mp3', 'libvorbis', 'ac3', 'pcm_s16le'])
}

/** Pick an audio codec the target container supports, preserving intent. */
function safeAudioCodec(format: string, requested: VideoOptions['audioCodec']): string {
  const allowed = CONTAINER_AUDIO[format]
  if (!allowed || allowed.has(requested)) return requested
  if (format === 'webm') return 'opus'
  if (format === 'avi') return 'mp3'
  return 'aac'
}

function audioFlags(v: VideoOptions): string[] {
  if (v.mute || v.audioCodec === 'none') return ['-an']
  const codec = safeAudioCodec(v.format, v.audioCodec)
  switch (codec) {
    case 'aac':
      return ['-c:a', 'aac', '-b:a', `${v.audioBitrateKbps}k`]
    case 'opus':
      return ['-c:a', 'libopus', '-b:a', `${v.audioBitrateKbps}k`]
    case 'mp3':
      return ['-c:a', 'libmp3lame', '-b:a', `${v.audioBitrateKbps}k`]
    default:
      return ['-c:a', 'aac', '-b:a', `${v.audioBitrateKbps}k`]
  }
}

function videoFlags(v: VideoOptions): string[] {
  const crf = String(crfFromQuality(v.quality))
  switch (v.format) {
    case 'webm':
      return ['-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0', '-pix_fmt', 'yuv420p']
    case 'avi':
      return ['-c:v', 'mpeg4', '-q:v', String(Math.min(31, Math.max(1, Math.round((100 - v.quality) / 3.3))))]
    default:
      return ['-c:v', 'libx264', '-crf', crf, '-preset', 'medium', '-pix_fmt', 'yuv420p']
  }
}

/** Scale filter string, preserving AR when only one dimension is requested. */
export function scaleFilter(v: VideoOptions, src: MediaFileMeta): string | null {
  const size = aspectSize(v.aspect, src.probe?.width, src.probe?.height, v.width, v.height)
  if (!size.w && !size.h) return null
  if (size.w && size.h) return `scale=${size.w}:${size.h}:force_original_aspect_ratio=decrease`
  if (size.w) return `scale=${size.w}:-2`
  return `scale=-2:${size.h}`
}

export async function convertVideo(
  inputPath: string,
  outDir: string,
  opts: VideoOptions,
  src: MediaFileMeta,
  onProgress: Progress,
  signal: AbortSignal
): Promise<RunResult> {
  onProgress(0.02, 'Preparing')
  const outPath = nextFreePath(outDir, baseName(src.name) || 'video', opts.format, existsSync)

  const args: string[] = ['-hide_banner', '-nostdin', '-y']
  if (opts.trimStart && opts.trimStart > 0) args.push('-ss', String(opts.trimStart))
  if (opts.trimEnd && opts.trimEnd > 0) args.push('-to', String(opts.trimEnd))
  args.push('-i', inputPath)

  const chain: string[] = []
  const scale = scaleFilter(opts, src)
  if (scale) chain.push(scale)
  if (opts.fps) chain.push(`fps=${opts.fps}`)
  if (opts.speed && opts.speed !== 1) chain.push(`setpts=${(1 / opts.speed).toFixed(4)}*PTS`)

  if (opts.format === 'gif') {
    const w = opts.gifWidth || 480
    const g = [`fps=${opts.gifFps || 15}`, `scale=${w}:-1:flags=lanczos`]
    if (opts.speed && opts.speed !== 1) g.push(`setpts=${(1 / opts.speed).toFixed(4)}*PTS`)
    args.push('-filter_complex', `[0:v]${g.join(',')},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`)
    args.push('-loop', '0')
  } else {
    if (chain.length) args.push('-vf', chain.join(','))
    args.push(...videoFlags(opts))
    args.push(...audioFlags(opts))
    args.push('-movflags', '+faststart')
  }

  args.push('-progress', 'pipe:1', '-nostats', outPath)

  const total = opts.trimEnd
    ? Math.max(0.1, opts.trimEnd - (opts.trimStart ?? 0))
    : src.probe?.durationSec
  await runFfmpeg(args, total, onProgress, signal, outDir)
  onProgress(1, 'Done')
  return { outPath }
}
