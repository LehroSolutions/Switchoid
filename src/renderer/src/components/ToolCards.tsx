import { useState } from 'react'
import { ImageIcon, FileVideo, Music4, Film, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ToolTab } from '../store'

/**
 * The four conversion cards the reference shows at once — image and video on
 * the left, audio and GIF on the right. Each owns its own tab's options, so
 * a user can tune all four before committing, and each expands to reveal the
 * full control set for that pipeline.
 */

const IMAGE_LABEL: Record<string, string> = {
  png: 'PNG',
  jpeg: 'JPG',
  webp: 'WEBP',
  avif: 'AVIF',
  tiff: 'TIFF',
  bmp: 'BMP'
}

const VIDEO_LABEL: Record<string, string> = {
  mp4: 'MP4',
  mov: 'MOV',
  mkv: 'MKV',
  avi: 'AVI',
  webm: 'WEBM',
  gif: 'GIF'
}

const AUDIO_LABEL: Record<string, string> = {
  mp3: 'MP3',
  wav: 'WAV',
  flac: 'FLAC',
  aac: 'AAC',
  ogg: 'OGG',
  opus: 'OPUS',
  m4a: 'M4A'
}

export interface ToolCardProps {
  tab: ToolTab
  title: string
  icon: typeof ImageIcon
  active: boolean
  onFocus: (tab: ToolTab) => void
  /** Primary controls: format chips + the one headline setting. */
  primary: ReactNode
  /** The full option panel for this pipeline. */
  details: ReactNode
  /** True when the pipeline needs ffmpeg and ffmpeg is unavailable. */
  blocked?: boolean
}

export function ToolCard({ title, icon: Icon, active, onFocus, tab, primary, details, blocked }: ToolCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className={`tool-card tile sheen flex flex-col p-4 ${active ? 'tile-active' : ''}`}
      data-tool={tab}
      aria-label={title}
    >
      <header className="relative z-10 mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-violet-brand)_20%,transparent)] text-[var(--color-violet-brand)]">
          <Icon size={16} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--text-strong)]">
          {title}
        </h3>
        <button type="button" className="tool-options" aria-label={`${open ? 'Hide' : 'Show'} ${tab} options`} aria-expanded={open} onClick={() => { setOpen(!open); onFocus(tab) }}><Settings2 size={14} /></button>
        {blocked ? (
          <span className="rounded-md bg-[color-mix(in_oklab,var(--color-amber-brand)_18%,transparent)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--color-amber-brand)]">
            ffmpeg
          </span>
        ) : null}
      </header>

      <div className="relative z-10 flex flex-col gap-3">{primary}</div>

      <div className="tool-details relative z-10">
        {open ? (
          <div className="mt-3 border-t border-[var(--glass-border)] pt-3">{details}</div>
        ) : null}
      </div>
    </section>
  )
}

/* ------------------------------------------------------- format chip grids */

export function FormatChips({
  values,
  labels,
  value,
  onChange,
  ariaLabel,
  columns = 3
}: {
  values: readonly string[]
  labels: Record<string, string>
  value: string
  onChange: (v: string) => void
  ariaLabel: string
  columns?: number
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`chip ${value === v ? 'chip-active' : ''}`}
        >
          {labels[v] ?? v.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export const IMAGE_CHIPS = { values: ['jpeg', 'png', 'webp', 'bmp', 'tiff', 'avif'], labels: IMAGE_LABEL }
export const VIDEO_CHIPS = {
  values: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'gif'],
  labels: VIDEO_LABEL
}
export const AUDIO_CHIPS = { values: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'], labels: AUDIO_LABEL }

export const CARD_ICONS = { image: ImageIcon, video: FileVideo, audio: Music4, gif: Film }
