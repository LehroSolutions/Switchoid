import { existsSync, statSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { execFile } from 'node:child_process'
import type { FfmpegStatus } from '@shared/types'

const EXE = process.platform === 'win32' ? '.exe' : ''

let cached: FfmpegStatus | null = null

/**
 * `process.resourcesPath` only exists inside the Electron runtime, so it is
 * probed defensively. That keeps this module importable from tests and tooling
 * instead of throwing at import time.
 */
function resourcesPath(): string {
  return (process as unknown as { resourcesPath?: string }).resourcesPath ?? ''
}

/**
 * ffmpeg resolution order:
 *  1. bundled `resources/bin` next to the asar (packaged builds)
 *  2. project-local `resources/bin` (dev builds)
 *  3. anything already on PATH
 */
function candidates(name: string): string[] {
  const dirs: string[] = []
  const res = resourcesPath()
  if (res) {
    dirs.push(join(res, 'bin'))
    dirs.push(join(res, 'app.asar.unpacked', 'resources', 'bin'))
  }
  dirs.push(join(process.cwd(), 'resources', 'bin'))
  return dirs.map((d) => join(d, name + EXE))
}

/** Synchronous PATH scan so bin resolution never depends on a warm cache. */
function searchPath(name: string): string | undefined {
  const exe = name + EXE
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue
    const p = join(dir, exe)
    try {
      if (existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* unreadable PATH entry; keep scanning */
    }
  }
  return undefined
}

/** First existing candidate, else a PATH lookup. */
function resolveBin(name: string): string | undefined {
  for (const c of candidates(name)) {
    try {
      if (existsSync(c)) return c
    } catch {
      /* keep looking */
    }
  }
  return searchPath(name)
}

function probeVersion(bin: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(bin, ['-hide_banner', '-version'], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(undefined)
      const first = String(stdout).split(/\r?\n/)[0]?.trim()
      resolve(first || undefined)
    })
  })
}

export async function ffmpegStatus(): Promise<FfmpegStatus> {
  if (cached) return cached

  const ffmpegPath = resolveBin('ffmpeg')

  if (!ffmpegPath) {
    cached = {
      available: false,
      error:
        'ffmpeg was not found. Place ffmpeg.exe in resources/bin, or add it to your PATH. Image conversion still works.'
    }
    return cached
  }

  const version = await probeVersion(ffmpegPath)
  if (!version) {
    cached = { available: false, ffmpegPath, error: `Could not run ${ffmpegPath}` }
    return cached
  }

  cached = { available: true, ffmpegPath, ffprobePath: resolveBin('ffprobe'), version }
  return cached
}

/**
 * Resolve the ffmpeg binary on demand. The cache is a convenience for the
 * status probe, not a prerequisite — a conversion started before the status
 * round-trip completes still finds a working binary.
 */
export function ffmpegBin(): string {
  const bin = cached?.ffmpegPath || resolveBin('ffmpeg')
  if (!bin) throw new Error('ffmpeg is not available on this system')
  return bin
}

export function ffprobeBin(): string | undefined {
  return cached?.ffprobePath || resolveBin('ffprobe')
}

export function resetFfmpegCache(): void {
  cached = null
}
