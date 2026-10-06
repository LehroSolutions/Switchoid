import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import type { AppSettings, HistoryEntry, Preset } from '@shared/types'

function userDataFile(name: string): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, name)
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

/** Write via a temp file + rename so a crash cannot truncate user data. */
function writeJson(file: string, value: unknown): void {
  const tmp = `${file}.tmp`
  try {
    writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
    renameSync(tmp, file)
  } catch (err) {
    console.error('[store] write failed', file, err)
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  askBeforeOverwrite: false,
  keepSourceMetadata: true,
  parallelJobs: 2,
  revealAfterConvert: false,
  reduceMotion: false
}

const MAX_HISTORY = 200

export const settings = {
  get(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(userDataFile('settings.json'), {}) }
  },
  save(patch: Partial<AppSettings>): AppSettings {
    const next = { ...settings.get(), ...patch }
    writeJson(userDataFile('settings.json'), next)
    return next
  }
}

export const history = {
  list(): HistoryEntry[] {
    return readJson<HistoryEntry[]>(userDataFile('history.json'), [])
  },
  add(entry: HistoryEntry): HistoryEntry[] {
    const next = [entry, ...this.list()].slice(0, MAX_HISTORY)
    writeJson(userDataFile('history.json'), next)
    return next
  },
  clear(): void {
    writeJson(userDataFile('history.json'), [])
  }
}

export const presets = {
  list(): Preset[] {
    return readJson<Preset[]>(userDataFile('presets.json'), [])
  },
  save(preset: Preset): Preset[] {
    const all = this.list().filter((p) => p.id !== preset.id)
    all.push(preset)
    writeJson(userDataFile('presets.json'), all)
    return all
  },
  remove(id: string): Preset[] {
    const next = this.list().filter((p) => p.id !== id || p.builtin)
    writeJson(userDataFile('presets.json'), next)
    return next
  }
}

export const paths = {
  defaultOutput(): string {
    const s = settings.get()
    if (s.outputDir && existsSync(s.outputDir)) return s.outputDir
    return join(app.getPath('downloads'), 'Switchoid')
  }
}
