import { spawn } from 'node:child_process'
import { ffmpegBin } from './ffmpeg'

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string
  ) {
    super(message)
    this.name = 'FfmpegError'
  }
}

/** Last actionable line of ffmpeg stderr — the UI shows this on failure. */
export function lastMeaningfulLine(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const err = [...lines].reverse().find((l) => /error|invalid|unable|failed|denied|no such/i.test(l))
  return err ?? lines[lines.length - 1] ?? 'Conversion failed'
}

/**
 * Runs ffmpeg with `-progress pipe:1` so we get machine-readable progress on
 * stdout, and captures stderr for diagnostics.
 */
export function runFfmpeg(
  args: string[],
  totalDurationSec: number | undefined,
  onProgress: (p: number, phase: string) => void,
  signal: AbortSignal,
  cwd: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new FfmpegError('Canceled', ''))
    const bin = ffmpegBin()
    const proc = spawn(bin, args, { windowsHide: true, cwd, stdio: ['ignore', 'pipe', 'pipe'] })

    let stderr = ''
    let settled = false
    let outTime = 0

    const onAbort = () => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      proc.kill()
      reject(new FfmpegError('Canceled', stderr))
    }
    signal.addEventListener('abort', onAbort, { once: true })

    proc.stdout.setEncoding('utf8')
    let buf = ''
    proc.stdout.on('data', (chunk: string) => {
      buf += chunk
      const lines = buf.split(/\r?\n/)
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const eq = line.indexOf('=')
        if (eq < 0) continue
        const key = line.slice(0, eq)
        const value = line.slice(eq + 1)
        if (key === 'out_time_us' || key === 'out_time_ms') {
          const us = Number(value)
          if (Number.isFinite(us) && us >= 0) outTime = us / 1_000_000
        } else if (key === 'progress') {
          if (value === 'end') onProgress(1, 'Finalizing')
          else if (totalDurationSec && totalDurationSec > 0)
            onProgress(Math.min(0.99, outTime / totalDurationSec), 'Encoding')
          else onProgress(0.5, 'Encoding')
        }
      }
    })

    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-64 * 1024)
    })

    proc.on('error', (err) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      reject(new FfmpegError(err.message, stderr))
    })

    proc.on('close', (code) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      if (code === 0) resolve(stderr)
      else reject(new FfmpegError(lastMeaningfulLine(stderr), stderr))
    })
  })
}

/** Maps the 1..100 quality slider onto ffmpeg's CRF scale. */
export function crfFromQuality(quality: number): number {
  const q = Math.min(100, Math.max(1, quality))
  return Math.round(51 - (q / 100) * 51)
}
