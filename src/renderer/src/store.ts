import { create } from 'zustand'
import {
  defaultAudioOptions,
  defaultGifOptions,
  defaultImageOptions,
  defaultVideoOptions,
  optionsForKind
} from '@shared/options'
import type {
  AppSettings,
  AudioOptions,
  ConversionJob,
  ConversionOptions,
  EngineStatus,
  HistoryEntry,
  ImageOptions,
  MediaFileMeta,
  MediaKind,
  Preset,
  VideoOptions
} from '@shared/types'

export type ToolTab = 'image' | 'video' | 'audio' | 'gif'
export type View = 'convert' | 'batch' | 'presets' | 'history' | 'settings'

/** Options for the currently active tool tab, seeded from shared defaults. */
export function optionsFor(tab: ToolTab): ConversionOptions {
  switch (tab) {
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

export function kindMatchesTab(kind: MediaKind, tab: ToolTab): boolean {
  if (tab === 'gif') return kind === 'gif' || kind === 'video'
  return kind === tab
}

/**
 * Options for a file that the active tab does not handle. The queue applies the
 * same fallback in the main process; this mirrors it so the UI can label the
 * effective format before the user commits.
 */
export function optionsForFile(kind: MediaKind): ConversionOptions {
  return optionsForKind(kind)
}

/** Loose partial of any option shape — panels patch the fields they own. */
export type OptionsPatch = Partial<ImageOptions & VideoOptions & AudioOptions> | Record<string, unknown>

interface State {
  view: View
  tab: ToolTab
  theme: 'light' | 'dark'
  files: MediaFileMeta[]
  jobs: ConversionJob[]
  presets: Preset[]
  history: HistoryEntry[]
  settings: AppSettings | null
  engine: EngineStatus | null
  converting: boolean
  selectedJobId: string | null
  /** Live options for the active tool tab. */
  options: ConversionOptions
  /** Per-tab option memory, so switching tabs never loses a setup. */
  byTab: Partial<Record<ToolTab, ConversionOptions>>
  /** path → data-URL thumbnail, filled in lazily for queue and file rows. */
  previews: Record<string, string>

  setView(v: View): void
  setTab(t: ToolTab): void
  toggleTheme(): void
  addFiles(files: MediaFileMeta[]): void
  removeFile(path: string): void
  clearFiles(): void
  patch(patch: OptionsPatch): void
  /** Patch one tab's options without switching to it. Lets all four tool
   *  cards stay on screen at once, each owning its own settings. */
  patchTab(tab: ToolTab, patch: OptionsPatch): void
  /** Resolved options for any tab, seeding from shared defaults when unset. */
  optionsOf(tab: ToolTab): ConversionOptions
  applyPreset(p: Preset): void
  applyPresetTo(tab: ToolTab, p: Preset): void
  upsertJob(job: ConversionJob): void
  setConverting(v: boolean): void
  selectJob(id: string | null): void
  setPresets(p: Preset[]): void
  setHistory(h: HistoryEntry[]): void
  setSettings(s: AppSettings): void
  setEngine(e: EngineStatus): void
  setPreview(path: string, url: string): void
  dropPreview(path: string): void
}

export const useStore = create<State>((set, get) => ({
  view: 'convert',
  tab: 'image',
  theme: 'dark',
  files: [],
  jobs: [],
  presets: [],
  history: [],
  settings: null,
  engine: null,
  converting: false,
  selectedJobId: null,
  options: optionsFor('image'),
  byTab: {},
  previews: {},

  setView: (view) => set({ view }),

  setTab: (tab) =>
    set((s) => {
      const next = s.byTab[tab] ?? optionsFor(tab)
      return { tab, options: next, byTab: { ...s.byTab, [tab]: next } }
    }),

  toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

  addFiles: (incoming) =>
    set((s) => {
      const seen = new Set(s.files.map((f) => f.path))
      const fresh = incoming.filter((f) => {
        if (seen.has(f.path)) return false
        seen.add(f.path)
        return true
      })
      return { files: [...s.files, ...fresh] }
    }),

  removeFile: (path) =>
    set((s) => {
      const previews = { ...s.previews }
      delete previews[path]
      return { files: s.files.filter((f) => f.path !== path), previews }
    }),

  clearFiles: () => set({ files: [], previews: {} }),

  patch: (patch) =>
    set((s) => {
      const next = { ...(s.options as object), ...(patch as object) } as ConversionOptions
      return { options: next, byTab: { ...s.byTab, [s.tab]: next } }
    }),

  patchTab: (tab, patch) =>
    set((s) => {
      const base = s.byTab[tab] ?? (s.tab === tab ? s.options : optionsFor(tab))
      const next = { ...(base as object), ...(patch as object) } as ConversionOptions
      return {
        byTab: { ...s.byTab, [tab]: next },
        // Keep the active tab's live options in sync when it is the one patched.
        ...(s.tab === tab ? { options: next } : {})
      }
    }),

  optionsOf: (tab) => get().byTab[tab] ?? (get().tab === tab ? get().options : optionsFor(tab)),

  applyPreset: (p) =>
    set((s) => {
      const tab: ToolTab = p.options.kind === 'gif' ? 'gif' : p.options.kind
      return { tab, options: p.options, byTab: { ...s.byTab, [tab]: p.options } }
    }),

  applyPresetTo: (tab, p) =>
    set((s) => ({ byTab: { ...s.byTab, [tab]: p.options }, ...(s.tab === tab ? { options: p.options } : {}) })),

  upsertJob: (job) =>
    set((s) => {
      const idx = s.jobs.findIndex((j) => j.id === job.id)
      if (idx < 0) return { jobs: [...s.jobs, job] }
      const jobs = [...s.jobs]
      jobs[idx] = job
      return { jobs }
    }),

  setConverting: (converting) => set({ converting }),
  selectJob: (selectedJobId) => set({ selectedJobId }),
  setPresets: (presets) => set({ presets }),
  setHistory: (history) => set({ history }),
  setSettings: (settings) => set({ settings }),
  setEngine: (engine) => set({ engine }),

  setPreview: (path, url) => set((s) => {
    const entries = Object.entries(s.previews).filter(([key]) => key !== path).slice(-103)
    return { previews: { ...Object.fromEntries(entries), [path]: url } }
  }),

  dropPreview: (path) =>
    set((s) => {
      if (!s.previews[path]) return {}
      const next = { ...s.previews }
      delete next[path]
      return { previews: next }
    })
}))
