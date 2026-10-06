import type { AudioOptions, ConversionOptions, ImageOptions, Preset, VideoOptions } from '@shared/types'

const image = (o: ImageOptions): ConversionOptions => ({ kind: 'image', ...o })
const video = (o: VideoOptions): ConversionOptions => ({ kind: 'video', ...o })
const gif = (o: VideoOptions): ConversionOptions => ({ kind: 'gif', ...o })
const audio = (o: AudioOptions): ConversionOptions => ({ kind: 'audio', ...o })

/** Shipped presets that appear in the right rail. Users can add their own. */
export function builtinPresets(): Preset[] {
  return [
    {
      id: 'img-social', name: 'Social Media (Images)', hint: 'JPG · 90% · Resize 1080px', kind: 'image', builtin: true,
      options: image({ format: 'jpeg', quality: 90, width: 1080, height: 1080, aspect: 'original', fit: 'inside', background: '#ffffff', rotate: 0, flipH: false, flipV: false, stripMetadata: true, sharpen: false })
    },
    {
      id: 'img-webp-80',
      name: 'WebP · 80%',
      hint: 'Images → WebP',
      kind: 'image',
      builtin: true,
      options: image({
        format: 'webp',
        quality: 80,
        aspect: 'original',
        fit: 'inside',
        background: '#00000000',
        rotate: 0,
        flipH: false,
        flipV: false,
        stripMetadata: true,
        sharpen: false
      })
    },
    {
      id: 'img-avif-65',
      name: 'AVIF · 65%',
      hint: 'Images → AVIF',
      kind: 'image',
      builtin: true,
      options: image({
        format: 'avif',
        quality: 65,
        aspect: 'original',
        fit: 'inside',
        background: '#00000000',
        rotate: 0,
        flipH: false,
        flipV: false,
        stripMetadata: true,
        sharpen: false
      })
    },
    {
      id: 'img-thumb-512',
      name: 'Thumbnail 512',
      hint: 'Square cover crop',
      kind: 'image',
      builtin: true,
      options: image({
        format: 'webp',
        quality: 82,
        aspect: '1:1',
        width: 512,
        height: 512,
        fit: 'cover',
        background: '#00000000',
        rotate: 0,
        flipH: false,
        flipV: false,
        stripMetadata: true,
        sharpen: true
      })
    },
    {
      id: 'vid-mp4-1080',
      name: 'Video for Sharing',
      hint: 'MP4 · H.264 · 1080p',
      kind: 'video',
      builtin: true,
      options: video({
        format: 'mp4',
        quality: 75,
        aspect: 'original',
        height: 1080,
        fps: 30,
        audioCodec: 'aac',
        audioBitrateKbps: 160,
        mute: false,
        gifFps: 15,
        gifWidth: 480,
        speed: 1
      })
    },
    {
      id: 'vid-mp4-720',
      name: 'MP4 · 720p',
      hint: 'Video → H.264',
      kind: 'video',
      builtin: true,
      options: video({
        format: 'mp4',
        quality: 68,
        aspect: 'original',
        height: 720,
        fps: 30,
        audioCodec: 'aac',
        audioBitrateKbps: 128,
        mute: false,
        gifFps: 15,
        gifWidth: 480,
        speed: 1
      })
    },
    {
      id: 'vid-vertical',
      name: 'Vertical 9:16',
      hint: 'Reel-ready crop',
      kind: 'video',
      builtin: true,
      options: video({
        format: 'mp4',
        quality: 76,
        aspect: '9:16',
        width: 1080,
        height: 1920,
        fps: 30,
        audioCodec: 'aac',
        audioBitrateKbps: 160,
        mute: false,
        gifFps: 15,
        gifWidth: 480,
        speed: 1
      })
    },
    {
      id: 'gif-480',
      name: 'GIF for Web',
      hint: 'GIF · 15 fps · Optimized',
      kind: 'gif',
      builtin: true,
      options: gif({
        format: 'gif',
        quality: 75,
        aspect: 'original',
        fps: 0,
        audioCodec: 'none',
        audioBitrateKbps: 128,
        mute: true,
        gifFps: 15,
        gifWidth: 480,
        speed: 1
      })
    },
    {
      id: 'aud-mp3-320',
      name: 'Audio High Quality',
      hint: 'MP3 · 320 kbps',
      kind: 'audio',
      builtin: true,
      options: audio({
        format: 'mp3',
        quality: 90,
        bitrateKbps: 320,
        channels: 2,
        sampleRate: 44100,
        normalize: false,
        fadeIn: 0,
        fadeOut: 0
      })
    },
    {
      id: 'aud-flac-norm',
      name: 'FLAC normalized',
      hint: 'Lossless · -14 LUFS',
      kind: 'audio',
      builtin: true,
      options: audio({
        format: 'flac',
        quality: 100,
        bitrateKbps: 320,
        channels: 2,
        sampleRate: 48000,
        normalize: true,
        fadeIn: 0,
        fadeOut: 0
      })
    }
  ]
}
