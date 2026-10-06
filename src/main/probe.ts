import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { ffprobeBin } from './ffmpeg'
import type { MediaFileMeta, ProbeResult } from '@shared/types'
import { kindFromPath } from '@shared/utils'

/**
 * Probes a media file with ffprobe. Returns a minimal structural result when
 * ffprobe is unavailable or fails — the UI must never depend on probe success
 * to show a file.
 */
export async function probeFile(path: string, fallbackKind: MediaFileMeta['kind']): Promise<ProbeResult> {
  const empty: ProbeResult = {
    hasAudio: fallbackKind === 'audio',
    hasVideo: fallbackKind !== 'audio'
  }
  const bin = ffprobeBin()
  if (!bin || !existsSync(bin)) return empty

  return new Promise((resolve) => {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      path
    ]
    execFile(bin, args, { windowsHide: true, timeout: 15000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(empty)
      try {
        resolve(parseProbe(JSON.parse(String(stdout))))
      } catch {
        resolve(empty)
      }
    })
  })
}

function parseProbe(json: any): ProbeResult {
  const streams: any[] = Array.isArray(json?.streams) ? json.streams : []
  const format = json?.format ?? {}
  const video = streams.find((s) => s.codec_type === 'video')
  const audio = streams.find((s) => s.codec_type === 'audio')

  const out: ProbeResult = {
    hasAudio: Boolean(audio),
    hasVideo: Boolean(video)
  }

  if (video) {
    out.width = Number(video.width) || undefined
    out.height = Number(video.height) || undefined
    out.videoCodec = video.codec_name ? String(video.codec_name) : undefined
    const fr = String(video.avg_frame_rate ?? video.r_frame_rate ?? '0/1')
    const [n, d] = fr.split('/').map(Number)
    if (n && d) out.fps = Math.round((n / d) * 100) / 100
  }
  if (audio) {
    out.audioCodec = audio.codec_name ? String(audio.codec_name) : undefined
    out.audioChannels = Number(audio.channels) || undefined
    out.audioSampleRate = Number(audio.sample_rate) || undefined
  }
  const dur = Number(format.duration)
  if (Number.isFinite(dur) && dur > 0) out.durationSec = dur
  const br = Number(format.bit_rate)
  if (Number.isFinite(br) && br > 0) out.bitrateKbps = Math.round(br / 1000)
  return out
}

export function kindForMeta(path: string, name: string): MediaFileMeta['kind'] {
  return kindFromPath(path) ?? kindFromPath(name) ?? 'image'
}
