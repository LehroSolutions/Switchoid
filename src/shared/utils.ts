import type {
  AspectMode,
  AudioFormat,
  ConversionOptions,
  ImageFormat,
  MediaKind,
  VideoFormat
} from './types'

export * from './types'

/** Bytes → human readable, IEC-ish but with decimal MB for media sizes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`
  const m = Math.floor(s / 60)
  const rest = Math.round(s % 60)
  if (m < 60) return `${m}m ${rest}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function formatSeconds(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'tif', 'bmp', 'gif', 'heic', 'jxl', 'svg'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'wmv', 'flv', 'ts', 'm2ts', 'gifv'])
const AUDIO_EXT = new Set(['mp3', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'm4a', 'wma', 'aiff', 'aif', 'amr'])

export function kindFromPath(path: string): 'image' | 'video' | 'audio' | 'gif' | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'gif') return 'gif'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_EXT.has(ext)) return 'audio'
  return null
}

export function targetExtensionFor(options: ConversionOptions): string {
  return options.format
}

/** Build a candidate output path, appending " (n)" until it is free. */
export function nextFreePath(dir: string, base: string, ext: string, exists: (p: string) => boolean): string {
  const cleanExt = ext.replace(/^\./, '')
  let candidate = `${dir}\\${base}.${cleanExt}`
  let n = 1
  while (n < 9999 && exists(candidate)) {
    candidate = `${dir}\\${base} (${n}).${cleanExt}`
    n++
  }
  return candidate
}

/** Strip a trailing extension from a filename. */
export function baseName(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

export function aspectSize(
  aspect: AspectMode,
  srcW?: number,
  srcH?: number,
  width?: number,
  height?: number
): { w?: number; h?: number } {
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2)
  if (aspect === 'original') {
    const out: { w?: number; h?: number } = {}
    if (width) out.w = even(width)
    if (height) out.h = even(height)
    if (!width && !height && srcW && srcH) {
      out.w = even(srcW)
      out.h = even(srcH)
    }
    return out
  }
  const ratios: Record<Exclude<AspectMode, 'original'>, [number, number]> = {
    '16:9': [16, 9],
    '9:16': [9, 16],
    '4:3': [4, 3],
    '1:1': [1, 1]
  }
  const [rw, rh] = ratios[aspect as Exclude<AspectMode, 'original'>]
  let w = width
  let h = height
  if (w && !h) h = Math.round((w / rw) * rh)
  if (h && !w) w = Math.round((h / rh) * rw)
  if (!w && !h) {
    const base = Math.min(srcW ?? 1920, srcH ?? 1080, 1920)
    w = base
    h = Math.round((base / rw) * rh)
  }
  return { w: even(w!), h: even(h!) }
}

export const IMAGE_FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'tiff', 'bmp']
export const VIDEO_FORMATS: VideoFormat[] = ['mp4', 'webm', 'mkv', 'mov', 'gif', 'avi']
export const AUDIO_FORMATS: AudioFormat[] = ['mp3', 'aac', 'wav', 'flac', 'ogg', 'opus', 'm4a']

export function formatAcceptFor(kinds: MediaKind[]): string {
  const parts: string[] = []
  for (const k of kinds) {
    if (k === 'image') parts.push('image/*')
    if (k === 'video') parts.push('video/*')
    if (k === 'audio') parts.push('audio/*')
    if (k === 'gif') parts.push('image/gif', 'video/*')
  }
  return parts.join(',')
}
