export type MediaKind = 'image' | 'video' | 'audio' | 'gif'

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'tiff' | 'bmp'
export type VideoFormat = 'mp4' | 'webm' | 'mkv' | 'mov' | 'gif' | 'avi'
export type AudioFormat = 'mp3' | 'aac' | 'wav' | 'flac' | 'ogg' | 'opus' | 'm4a'

export type AspectMode = 'original' | '16:9' | '9:16' | '4:3' | '1:1'

export interface ImageOptions {
  format: ImageFormat
  quality: number
  width?: number
  height?: number
  aspect: AspectMode
  fit: 'cover' | 'contain' | 'inside' | 'fill'
  background: string
  rotate: number
  flipH: boolean
  flipV: boolean
  stripMetadata: boolean
  sharpen: boolean
}

export interface VideoOptions {
  format: VideoFormat
  quality: number
  width?: number
  height?: number
  aspect: AspectMode
  fps?: number
  videoBitrateKbps?: number
  audioCodec: 'aac' | 'opus' | 'mp3' | 'none'
  audioBitrateKbps: number
  mute: boolean
  gifFps: number
  gifWidth: number
  speed: number
  trimStart?: number
  trimEnd?: number
}

export interface AudioOptions {
  format: AudioFormat
  quality: number
  bitrateKbps: number
  channels: 1 | 2
  sampleRate: 44100 | 48000
  normalize: boolean
  trimStart?: number
  trimEnd?: number
  fadeIn: number
  fadeOut: number
}

/** Trim window shared by video, GIF and audio pipelines. */
export interface TrimOptions {
  trimStart?: number
  trimEnd?: number
}

export type ConversionOptions =
  | ({ kind: 'image' } & ImageOptions)
  | ({ kind: 'video' | 'gif' } & VideoOptions)
  | ({ kind: 'audio' } & AudioOptions)

export interface MediaFileMeta {
  path: string
  name: string
  ext: string
  kind: MediaKind
  size: number
  modifiedMs: number
  /** ffmpeg-probed streams, null when probing was impossible. */
  probe: ProbeResult | null
  /** renderer-local object URL for preview, revoked when the entry is dropped. */
  previewUrl?: string
}

export interface ProbeResult {
  durationSec?: number
  width?: number
  height?: number
  fps?: number
  videoCodec?: string
  audioCodec?: string
  audioChannels?: number
  audioSampleRate?: number
  bitrateKbps?: number
  hasAudio: boolean
  hasVideo: boolean
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'

export interface ConversionJob {
  id: string
  file: MediaFileMeta
  options: ConversionOptions
  status: JobStatus
  /** 0..1 */
  progress: number
  outPath?: string
  outSize?: number
  error?: string
  startedAt?: number
  finishedAt?: number
  /** Human readable phase from the backend, e.g. "Encoding". */
  phase?: string
  log: string[]
}

export interface HistoryEntry {
  id: string
  inPath: string
  inName: string
  inKind: MediaKind
  outPath: string
  outName: string
  outSize: number
  kind: MediaKind
  format: string
  durationMs: number
  at: number
}

export interface Preset {
  id: string
  name: string
  hint: string
  kind: MediaKind | 'any'
  options: ConversionOptions
  builtin?: boolean
}

export interface FfmpegStatus {
  available: boolean
  ffmpegPath?: string
  ffprobePath?: string
  version?: string
  error?: string
}

export interface EngineStatus {
  sharp: boolean
  ffmpeg: FfmpegStatus
}

/** Live process telemetry for the performance card. */
export interface AppMetrics {
  /** Whole-percent CPU across every app process. */
  cpuPercent: number
  /** Resident working set across every app process. */
  memoryMB: number
  /** Process count reported by Electron. */
  processes: number
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  outputDir?: string
  askBeforeOverwrite: boolean
  keepSourceMetadata: boolean
  parallelJobs: number
  revealAfterConvert: boolean
  reduceMotion: boolean
}

export interface ConvertRequest {
  paths: string[]
  options: ConversionOptions
  outputDir?: string
  overwrite?: boolean
}

export interface ConvertBatchResult {
  jobs: ConversionJob[]
}

export interface SwitchoidApi {
  engineStatus(): Promise<EngineStatus>
  appMetrics(): Promise<AppMetrics>
  pickFiles(): Promise<MediaFileMeta[]>
  addPaths(paths: string[]): Promise<MediaFileMeta[]>
  readPreview(path: string): Promise<string | null>
  /** Resolves real filesystem paths for dropped File objects (Electron ≥32). */
  getPathForFile(file: File): string
  convert(req: ConvertRequest): Promise<ConvertBatchResult>
  cancel(jobId: string): Promise<void>
  showInFolder(path: string): Promise<void>
  openPath(path: string): Promise<void>
  history(): Promise<HistoryEntry[]>
  clearHistory(): Promise<HistoryEntry[]>
  settings(): Promise<AppSettings>
  saveSettings(s: Partial<AppSettings>): Promise<AppSettings>
  presets(): Promise<Preset[]>
  savePreset(p: Preset): Promise<Preset[]>
  deletePreset(id: string): Promise<Preset[]>
  chooseOutputDir(): Promise<string | undefined>
  onJobUpdate(cb: (job: ConversionJob) => void): () => void
  onQueueDone(cb: (summary: { done: number; failed: number }) => void): () => void

  windowMinimize(): Promise<void>
  windowToggleMaximize(): Promise<boolean>
  windowClose(): Promise<void>
  onWindowState(cb: (maximized: boolean) => void): () => void
}
