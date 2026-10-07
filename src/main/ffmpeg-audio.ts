import { existsSync } from 'node:fs'
import { runFfmpeg } from './ffmpeg-run'
import type { AudioOptions, MediaFileMeta } from '@shared/types'
import { baseName, nextFreePath } from '@shared/utils'

export interface AudioRunResult {
  outPath: string
}

type Progress = (p: number, phase: string) => void

export async function convertAudio(
  inputPath: string,
  outDir: string,
  opts: AudioOptions,
  src: MediaFileMeta,
  onProgress: Progress,
  signal: AbortSignal
): Promise<AudioRunResult> {
  onProgress(0.02, 'Preparing')
  const outPath = nextFreePath(outDir, baseName(src.name) || 'audio', opts.format, existsSync)

  const args: string[] = ['-hide_banner', '-nostdin', '-y']
  if (opts.trimStart && opts.trimStart > 0) args.push('-ss', String(opts.trimStart))
  if (opts.trimEnd && opts.trimEnd > 0) args.push('-to', String(opts.trimEnd))
  args.push('-i', inputPath)

  const bitrate = `${opts.bitrateKbps}k`
  switch (opts.format) {
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-b:a', bitrate)
      break
    case 'aac':
    case 'm4a':
      args.push('-c:a', 'aac', '-b:a', bitrate)
      break
    case 'wav':
      args.push('-c:a', 'pcm_s16le')
      break
    case 'flac':
      args.push('-c:a', 'flac')
      break
    case 'ogg':
      args.push('-c:a', 'libvorbis', '-b:a', bitrate)
      break
    case 'opus':
      args.push('-c:a', 'libopus', '-b:a', bitrate)
      break
  }

  const filters: string[] = []
  if (opts.normalize) filters.push('loudnorm=I=-14:TP=-1.5:LRA=11')
  if (opts.fadeIn > 0) filters.push(`afade=t=in:st=0:d=${opts.fadeIn}`)
  if (opts.fadeOut > 0) {
    const dur = (opts.trimEnd ?? src.probe?.durationSec ?? 0) - (opts.trimStart ?? 0)
    const start = Math.max(0, dur - opts.fadeOut)
    filters.push(`afade=t=out:st=${start.toFixed(2)}:d=${opts.fadeOut}`)
  }
  if (filters.length) args.push('-af', filters.join(','))

  const sampleRate = opts.format === 'opus' ? 48000 : opts.sampleRate
  args.push('-ac', String(opts.channels), '-ar', String(sampleRate), '-vn')
  args.push('-progress', 'pipe:1', '-nostats', outPath)

  const total =
    opts.trimEnd && opts.trimEnd > 0
      ? Math.max(0.1, opts.trimEnd - (opts.trimStart ?? 0))
      : src.probe?.durationSec
  await runFfmpeg(args, total, onProgress, signal, outDir)
  onProgress(1, 'Done')
  return { outPath }
}
