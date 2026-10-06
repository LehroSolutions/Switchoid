import { History as HistoryIcon, FolderOpen, Trash2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Button, EmptyState, TextInput } from '../components/ui'
import { formatBytes, formatDuration } from '@shared/utils'

export function HistoryView() {
  const { history, setHistory } = useStore()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      (h) => h.inName.toLowerCase().includes(q) || h.outName.toLowerCase().includes(q)
    )
  }, [history, query])

  const clear = async () => setHistory(await window.switchoid.clearHistory())

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5 px-8 pb-10 pt-24">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]">History</h2>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            The last {history.length} conversion{history.length === 1 ? '' : 's'} on this machine.
          </p>
        </div>
        {history.length ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 size={13} />
            Clear history
          </Button>
        ) : null}
      </header>

      {history.length ? (
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by file name…"
            aria-label="Filter history"
            className="pl-9"
          />
        </div>
      ) : null}

      {filtered.length ? (
        <section className="panel overflow-hidden">
          <ul className="divide-y divide-[var(--glass-border)]">
            {filtered.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--color-teal-brand)_12%,transparent)] text-[var(--color-teal-brand)]">
                  <HistoryIcon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--text-strong)]">{h.outName}</p>
                  <p className="truncate text-[11px] text-[var(--text-faint)]">
                    from {h.inName} · {formatBytes(h.outSize)} · {formatDuration(h.durationMs)} ·{' '}
                    {new Date(h.at).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--glass-inset)] px-2 py-0.5 text-[10.5px] font-medium uppercase text-[var(--text-muted)]">
                  {h.format}
                </span>
                <button
                  onClick={() => window.switchoid.showInFolder(h.outPath)}
                  aria-label={`Show ${h.outName} in folder`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition-colors hover:text-[var(--color-violet-brand)]"
                >
                  <FolderOpen size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : history.length ? (
        <EmptyState
          icon={<Search size={20} />}
          title="No matches"
          body={`Nothing in history matches “${query}”.`}
        />
      ) : (
        <EmptyState
          icon={<HistoryIcon size={20} />}
          title="No conversions yet"
          body="Finished conversions appear here so you can find the output again later."
        />
      )}
    </div>
  )
}