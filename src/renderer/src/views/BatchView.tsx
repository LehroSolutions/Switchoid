import { useMemo } from 'react'
import { ListChecks, FolderOpen, Trash2, Play } from 'lucide-react'
import { optionsForFile, useStore } from '../store'
import { Button, EmptyState } from '../components/ui'
import { formatBytes } from '@shared/utils'
import { optionsHandleKind } from '@shared/options'
import type { MediaKind } from '@shared/types'

/**
 * Batch view: everything staged at once, grouped by kind, with a single
 * per-group conversion action. Each group is encoded with options that can
 * actually handle its kind, so mixed batches never cross the pipelines.
 */
export function BatchView() {
  const { files, options, setConverting, removeFile } = useStore()

  const groups = useMemo(() => {
    const by = new Map<string, typeof files>()
    for (const f of files) {
      const list = by.get(f.kind) ?? []
      list.push(f)
      by.set(f.kind, list)
    }
    return [...by.entries()]
  }, [files])

  /** Active-tab options when they fit this kind, otherwise that kind's defaults. */
  const groupOptions = (kind: MediaKind) =>
    optionsHandleKind(options.kind, kind) ? options : optionsForFile(kind)

  const runGroup = async (kind: string, paths: string[]) => {
    setConverting(true)
    try {
      await window.switchoid.convert({ paths, options: groupOptions(kind as MediaKind) })
    } catch (err) {
      console.error('[switchoid] batch failed', err)
    } finally {
      setConverting(false)
    }
  }

  if (!files.length) {
    return (
      <div className="mx-auto max-w-[980px] px-8 pb-10 pt-24">
        <EmptyState
          icon={<ListChecks size={20} />}
          title="Nothing staged yet"
          body="Add files from the Convert view, then come back here to run them as a batch."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5 px-8 pb-10 pt-24">
      <header>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]">Batch queue</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {files.length} file{files.length === 1 ? '' : 's'} across {groups.length} type
          {groups.length === 1 ? '' : 's'} — each group encodes with the settings for its own format.
        </p>
      </header>

      {groups.map(([kind, list]) => (
        <section key={kind} className="panel overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold capitalize text-[var(--text-strong)]">{kind}</h3>
              <p className="text-[11px] text-[var(--text-faint)]">
                {list.length} file{list.length === 1 ? '' : 's'} ·{' '}
                {formatBytes(list.reduce((a, f) => a + f.size, 0))} →{' '}
                <span className="font-semibold text-[var(--text-muted)]">
                  {groupOptions(kind as MediaKind).format.toUpperCase()}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void runGroup(kind, list.map((f) => f.path))}
            >
              <Play size={13} />
              Convert {list.length}
            </Button>
          </header>
          <ul className="divide-y divide-[var(--glass-border)]">
            {list.map((f) => (
              <li key={f.path} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--text-strong)]">{f.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-faint)]">
                  {formatBytes(f.size)}
                </span>
                <button
                  onClick={() => window.switchoid.openPath(f.path)}
                  aria-label={`Open ${f.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition-colors hover:text-[var(--text-strong)]"
                >
                  <FolderOpen size={13} />
                </button>
                <button
                  onClick={() => removeFile(f.path)}
                  aria-label={`Remove ${f.name}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition-colors hover:text-[var(--color-rose-brand)]"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}