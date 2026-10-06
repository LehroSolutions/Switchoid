import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { basename } from 'node:path'
import { CanceledError, convertImage, discardPartial, fileSize } from './image'
import { convertVideo } from './ffmpeg-video'
import { convertAudio } from './ffmpeg-audio'
import { FfmpegError } from './ffmpeg-run'
import { history, paths, settings } from './store'
import { optionsForKind, optionsHandleKind } from '@shared/options'
import type { ConversionJob, ConvertRequest, MediaFileMeta } from '@shared/types'

type JobListener = (job: ConversionJob) => void
type DoneListener = (summary: { done: number; failed: number }) => void

const listeners = new Set<JobListener>()
const doneListeners = new Set<DoneListener>()
/** jobId → abort controller, so cancel() can kill ffmpeg mid-encode. */
const running = new Map<string, AbortController>()
const waiting = new Map<string, ConversionJob>()

export function onJobUpdate(cb: JobListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function onQueueDone(cb: DoneListener): () => void {
  doneListeners.add(cb)
  return () => doneListeners.delete(cb)
}

function emit(job: ConversionJob): void {
  for (const cb of listeners) {
    try {
      cb(job)
    } catch (err) {
      console.error('[queue] listener threw', err)
    }
  }
}

export function cancelJob(jobId: string): void {
  running.get(jobId)?.abort()
  const job = waiting.get(jobId)
  if (job) {
    job.status = 'canceled'
    job.phase = 'Canceled'
    job.finishedAt = Date.now()
    job.error = 'Canceled by user'
    waiting.delete(jobId)
    emit(job)
  }
}

/**
 * Pick the options for one file. The active tab's options are used when they
 * can encode this kind of file; otherwise that kind's defaults are used, so a
 * mixed batch never tries to run image options through ffmpeg.
 */
function optionsFor(file: MediaFileMeta, requested: ConvertRequest['options']): ConvertRequest['options'] {
  return optionsHandleKind(requested.kind, file.kind) ? requested : optionsForKind(file.kind)
}

export async function enqueue(req: ConvertRequest, files: MediaFileMeta[]): Promise<ConversionJob[]> {
  // Falls back to Downloads/Switchoid so a first run works with zero setup.
  const outDir = req.outputDir || paths.defaultOutput()
  mkdirSync(outDir, { recursive: true })

  const parallel = Math.max(1, Math.min(8, settings.get().parallelJobs || 2))

  const jobs: ConversionJob[] = files.map((file) => ({
    id: randomUUID(),
    file,
    options: optionsFor(file, req.options),
    status: 'queued',
    progress: 0,
    log: []
  }))

  for (const job of jobs) { waiting.set(job.id, job); emit(job) }

  const queue = [...jobs]
  let done = 0
  let failed = 0

  const worker = async (): Promise<void> => {
    for (;;) {
      const job = queue.shift()
      if (!job) return
      waiting.delete(job.id)
      if (job.status === 'canceled') continue
      await runJob(job, outDir, () => {
        done++
      }, () => {
        failed++
      })
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallel, jobs.length) }, worker))

  for (const cb of doneListeners) {
    try {
      cb({ done, failed })
    } catch (err) {
      console.error('[queue] done listener threw', err)
    }
  }
  return jobs
}

async function runJob(
  job: ConversionJob,
  outDir: string,
  onDone: () => void,
  onFail: () => void
): Promise<void> {
  const started = Date.now()
  const controller = new AbortController()
  running.set(job.id, controller)

  job.status = 'running'
  job.startedAt = started
  job.progress = 0
  job.phase = 'Starting'
  emit(job)

  let lastProgressAt = 0
  const onProgress = (p: number, phase: string) => {
    const now = Date.now()
    const phaseChanged = job.phase !== phase
    job.progress = Math.max(0, Math.min(1, p))
    job.phase = phase
    if (phaseChanged || p >= 1 || now - lastProgressAt >= 100) {
      lastProgressAt = now
      emit(job)
    }
  }

  try {
    const outPath = await execute(job, outDir, onProgress, controller.signal)
    job.outPath = outPath
    job.outSize = await fileSize(outPath)
    job.progress = 1
    job.status = 'done'
    job.phase = 'Done'
    job.finishedAt = Date.now()
    job.log.push(`Done in ${((job.finishedAt - started) / 1000).toFixed(2)}s`)
    emit(job)

    history.add({
      id: job.id,
      inPath: job.file.path,
      inName: job.file.name,
      inKind: job.file.kind,
      outPath,
      outName: basename(outPath),
      outSize: job.outSize ?? 0,
      kind: job.options.kind,
      format: job.options.format,
      durationMs: job.finishedAt - started,
      at: job.finishedAt
    })
    onDone()
  } catch (err) {
    const canceled =
      (err instanceof CanceledError || err instanceof FfmpegError) && err.message === 'Canceled'
    job.status = canceled ? 'canceled' : 'failed'
    job.phase = canceled ? 'Canceled' : 'Failed'
    job.error = canceled ? 'Canceled by user' : err instanceof Error ? err.message : String(err)
    job.finishedAt = Date.now()
    if (err instanceof FfmpegError && err.stderr) job.log.push(...err.stderr.split(/\r?\n/).filter(Boolean).slice(-12))
    emit(job)
    if (!canceled) onFail()
  } finally {
    running.delete(job.id)
  }
}

async function execute(
  job: ConversionJob,
  outDir: string,
  onProgress: (p: number, phase: string) => void,
  signal: AbortSignal
): Promise<string> {
  const opts = job.options
  const input = job.file.path

  try {
    if (opts.kind === 'image') {
      return await convertImage(input, outDir, opts, onProgress, signal)
    }
    if (opts.kind === 'audio') {
      const { outPath } = await convertAudio(input, outDir, opts, job.file, onProgress, signal)
      return outPath
    }
    const { outPath } = await convertVideo(input, outDir, opts, job.file, onProgress, signal)
    return outPath
  } catch (err) {
    // A canceled sharp encode can leave a truncated file behind.
    if (err instanceof CanceledError) await discardPartial(err.partialPath ?? '')
    throw err
  }
}
