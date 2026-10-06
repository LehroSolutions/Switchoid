import { Zap, Box, Scan, History, Settings, ShieldCheck, GitBranch } from 'lucide-react'
import { LogoMark } from './LogoMark'
import type { View } from '../store'

const NAV: { id: View; label: string; icon: typeof Zap; key: string }[] = [
  { id: 'convert', label: 'Convert', icon: Zap, key: '1' },
  { id: 'batch', label: 'Batch', icon: Box, key: '2' },
  { id: 'presets', label: 'Presets', icon: Scan, key: '3' },
  { id: 'history', label: 'History', icon: History, key: '4' },
  { id: 'settings', label: 'Settings', icon: Settings, key: '5' }
]

/**
 * Left rail: brand, primary navigation, and the privacy promise that the
 * whole product is built on. Full labels (not icons alone) because the
 * reference shows text, and the destination names are not guessable.
 */
export function NavRail({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav
      aria-label="Main"
      className="nav-rail"
    >
      {/* Brand */}
      <div className="nav-brand">
        <LogoMark size={48} />
        <div className="min-w-0">
          <p className="brand-name">
            Switchoid
          </p>
          <p className="mt-1 truncate text-[11.5px] text-[var(--text-faint)]">
            Convert Anything. Anywhere.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-1.5">
        {NAV.map(({ id, label, icon: Icon, key }) => {
          const active = view === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              title={`${label} (${key})`}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {/* Privacy promise — the product's core claim, not decoration. */}
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2">
            <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-mint-brand)_18%,transparent)] text-[var(--color-mint-brand)]">
              <ShieldCheck size={13} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--color-mint-brand)] shadow-[0_0_8px_var(--color-mint-brand)]" />
            </span>
            <p className="text-[13px] font-semibold text-[var(--text-strong)]">Local Mode</p>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
            Runs 100% on your device.
            <br />
            No data leaves your machine.
          </p>
        </div>

        <div className="flex items-center justify-between px-1 text-[var(--text-faint)]">
          <span className="inline-flex items-center gap-1.5 text-[11.5px]">
            <GitBranch size={13} />
            Open Source
          </span>
          <span className="text-[11px] tabular-nums">v0.1.0</span>
        </div>
      </div>
    </nav>
  )
}
