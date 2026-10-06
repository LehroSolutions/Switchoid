import type {
  AudioOptions,
  ConversionOptions,
  ImageOptions,
  MediaKind,
  VideoOptions
} from './types'

/**
 * Canonical per-kind defaults. These live in shared/ so the renderer and the
 * main process cannot drift: the renderer seeds its option panels from them,
 * and the queue falls back to them for files whose kind the active tab does
 * not handle (mixed-kind batches).
 */

export const defaultImageOptions: ImageOptions = {
  format: 'webp',
  quality: 82,
  aspect: 'original',
  fit: 'inside',
  background: '#00000000',
  rotate: 0,
  flipH: false,
  flipV: false,
  stripMetadata: true,
  sharpen: false
}

export const defaultVideoOptions: VideoOptions = {
  format: 'mp4',
  quality: 75,
  aspect: 'original',
  fps: 30,
  audioCodec: 'aac',
  audioBitrateKbps: 160,
  mute: false,
  gifFps: 15,
  gifWidth: 480,
  speed: 1
}

export const defaultGifOptions: VideoOptions = {
  ...defaultVideoOptions,
  format: 'gif',
  mute: true,
  audioCodec: 'none',
  fps: 0
}

export const defaultAudioOptions: AudioOptions = {
  format: 'mp3',
  quality: 90,
  bitrateKbps: 320,
  channels: 2,
  sampleRate: 44100,
  normalize: false,
  fadeIn: 0,
  fadeOut: 0
}

/** Fresh defaults for a media kind, as a tagged ConversionOptions object. */
export function optionsForKind(kind: MediaKind): ConversionOptions {
  switch (kind) {
    case 'image':
      return { kind: 'image', ...defaultImageOptions }
    case 'video':
      return { kind: 'video', ...defaultVideoOptions }
    case 'gif':
      return { kind: 'gif', ...defaultGifOptions }
    case 'audio':
      return { kind: 'audio', ...defaultAudioOptions }
  }
}

/**
 * True when a set of options can legitimately encode a file of this kind.
 * GIF is bidirectional with video: either tab handles either input.
 */
export function optionsHandleKind(optionsKind: MediaKind, fileKind: MediaKind): boolean {
  if (optionsKind === fileKind) return true
  const pair = new Set([optionsKind, fileKind])
  return pair.has('gif') && pair.has('video')
}