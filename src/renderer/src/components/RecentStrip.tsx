import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, History as HistoryIcon, Sparkles } from 'lucide-react'
import type { HistoryEntry } from '@shared/types'
import { formatBytes, formatDuration } from '@shared/utils'

const KIND_ACCENT: Record<string, string> = {
  image: 'var(--color-cyan-brand)',
  video: 'var(--color-violet-brand)',
  audio: 'var(--color-pink-brand)',
  gif: 'var(--color-teal-brand)'
}

/**
 * The reference's "Recent Conversions" carousel. It is a real, scrollable
 * strip of finished work — arrow buttons page it, and each tile opens the
 * output in the OS file browser.
 */
export function RecentStrip({
  history,
  previews
}: {
  history: HistoryEntry[]
  previews: Record<string, string>
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const recent = history.slice(0, 24)

  /** Page the strip by one viewport-ish step. */
  const page = (dir: -1 | 1) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const sync = () => {
    const el = scroller.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  if (!recent.length) return <section className="recent-strip tile" aria-label="Recent conversions">
    <h2>Recent Conversions</h2>
    <div className="recent-empty"><HistoryIcon size={23} strokeWidth={1.3} /><span>Your finished files will appear here.<small>Convert your first file to start your collection.</small></span></div>
  </section>

  return (
    <section className="recent-strip tile sheen flex flex-col p-4" aria-label="Recent conversions">
      <header className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[var(--text-strong)]">
          <HistoryIcon size={15} className="text-[var(--color-cyan-brand)]" />
          Recent Conversions
        </h2>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Scroll recent conversions left"
            className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-hover)] hover:text-[var(--text-strong)] disabled:opacity-35 disabled:hover:bg-[var(--glass)]"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Scroll recent conversions right"
            className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-hover)] hover:text-[var(--text-strong)] disabled:opacity-35 disabled:hover:bg-[var(--glass)]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <ul
        ref={scroller}
        onScroll={sync}
        className="relative z-10 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1"
      >
        {recent.map((h) => (
          <li key={h.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => window.switchoid.showInFolder(h.outPath)}
              title={`${h.outName} · ${formatBytes(h.outSize)} · ${formatDuration(h.durationMs)}`}
              className="glass-hover group relative block h-[104px] w-[148px] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] text-left"
            >
              {previews[h.outPath] ? (
                <img
                  src={previews[h.outPath]}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-[color-mix(in_oklab,var(--color-violet-brand)_18%,transparent)]">
                  <Sparkles
                    size={20}
                    style={{ color: KIND_ACCENT[h.kind] ?? 'var(--color-violet-brand)' }}
                  />
                </span>
              )}

              {/* Format badge, mirroring the reference's tile labelling. */}
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                {h.format}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
