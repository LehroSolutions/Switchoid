import { memo } from 'react'
import { useStore } from '../store'
import {
  X,
  ImageIcon,
  FileVideo,
  FileAudio,
  Film,
  CircleAlert,
  CircleCheck,
  Loader2,
  FolderOpen
} from 'lucide-react'
import type { ConversionJob, MediaFileMeta, MediaKind } from '@shared/types'
import { formatBytes, formatSeconds } from '@shared/utils'

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  gif: Film
}

/**
 * A thumbnail tile. Images resolve a real preview through sharp; everything
 * else falls back to a tinted glyph, so a mixed queue still reads at a glance.
 */
export function Thumb({
  kind,
  preview,
  className = ''
}: {
  kind: MediaKind
  preview?: string
  className?: string
}) {
  const Icon = KIND_ICON[kind]
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[color-mix(in_oklab,var(--color-violet-brand)_16%,transparent)] text-[var(--text-muted)] ${className}`}
    >
      {preview ? (
        <img src={preview} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <Icon size={16} />
      )}
    </span>
  )
}

/** Source files staged for conversion. */
export function FileList({
  files,
  previews,
  onRemove,
  onClear
}: {
  files: MediaFileMeta[]
  previews: Record<string, string>
  onRemove: (path: string) => void
  onClear: () => void
}) {
  if (!files.length) return null

  return (
    <section className="tile overflow-hidden" aria-label="Selected files">
      <header className="relative z-10 flex items-center justify-between px-4 py-3">
        <h2 className="text-[13.5px] font-semibold text-[var(--text-strong)]">
          {files.length} file{files.length === 1 ? '' : 's'} staged
        </h2>
        <button
          onClick={onClear}
          className="text-[11.5px] font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--color-rose-brand)]"
        >
          Clear all
        </button>
      </header>

      <ul className="relative z-10 max-h-[188px] divide-y divide-[var(--glass-border)] overflow-y-auto">
        {files.map((f) => (
          <li
            key={f.path}
            className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--glass-hover)]"
          >
            <Thumb kind={f.kind} preview={previews[f.path]} className="h-9 w-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-[var(--text-strong)]">{f.name}</span>
              <span className="block truncate text-[10.5px] text-[var(--text-faint)]">
                {formatBytes(f.size)}
                {f.probe?.width ? ` · ${f.probe.width}×${f.probe.height}` : ''}
                {f.probe?.durationSec ? ` · ${formatSeconds(f.probe.durationSec)}` : ''}
              </span>
            </span>
            <button
              onClick={() => onRemove(f.path)}
              aria-label={`Remove ${f.name}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-[color-mix(in_oklab,var(--color-rose-brand)_16%,transparent)] hover:text-[var(--color-rose-brand)] focus-visible:opacity-100"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
/* ----------------------------------------------------------------- Queue */

/**
 * The right rail's queue: a thumbnail, live percentage and progress meter
 * per job, with cancel while running and reveal once the file is written.
 */
export function QueueList({ jobs }: { jobs: ConversionJob[] }) {
  if (!jobs.length) return null

  return (
    <ul className="relative z-10 flex max-h-[280px] flex-col gap-1.5 overflow-y-auto pr-0.5">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </ul>
  )
}

const JobRow = memo(function JobRow({ job }: { job: ConversionJob }) {
  const preview = useStore(s => s.previews[job.file.path])
  const pct = Math.round(job.progress * 100)
  const running = job.status === 'running' || job.status === 'queued'
  const done = job.status === 'done'
  const failed = job.status === 'failed'

  return (
    <li className="glass-hover rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] p-2.5">
      <div className="flex items-start gap-2.5">
        <span className="relative mt-0.5 shrink-0">
          <Thumb kind={job.file.kind} preview={preview} className="h-10 w-10" />
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--surface-raised)]">
            {done ? (
              <CircleCheck size={11} className="text-[var(--color-mint-brand)]" />
            ) : failed ? (
              <CircleAlert size={11} className="text-[var(--color-rose-brand)]" />
            ) : running ? (
              <Loader2 size={11} className="animate-spin text-[var(--color-cyan-brand)]" />
            ) : (
              <X size={11} className="text-[var(--text-faint)]" />
            )}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12px] font-medium text-[var(--text-strong)]">{job.file.name}</p>
            <span className="shrink-0 text-[10.5px] tabular-nums text-[var(--text-faint)]">
              {done ? formatBytes(job.outSize ?? 0) : running ? `${pct}%` : '—'}
            </span>
          </div>

          <p
            className={`mt-0.5 truncate text-[10.5px] ${
              failed ? 'text-[var(--color-rose-brand)]' : 'text-[var(--text-faint)]'
            }`}
            title={failed ? job.error : undefined}
          >
            {failed ? (job.error ?? 'Failed') : `${job.options.format.toUpperCase()} · ${job.phase ?? 'Queued'}`}
          </p>

          {running ? (
            <div
              className="meter mt-1.5"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${job.file.name} progress`}
            >
              <span style={{ width: `${Math.max(pct, 4)}%` }} />
            </div>
          ) : null}

          <div className="mt-1.5 flex items-center gap-3">
            {running ? (
              <button
                onClick={() => window.switchoid.cancel(job.id)}
                className="text-[10.5px] font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--color-rose-brand)]"
              >
                Cancel
              </button>
            ) : null}
            {job.outPath ? (
              <button
                onClick={() => window.switchoid.showInFolder(job.outPath as string)}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-faint)] transition-colors hover:text-[var(--color-cyan-brand)]"
              >
                <FolderOpen size={10} />
                Show
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
})
