import { Minus, Square, Copy, X } from 'lucide-react'
import type { CSSProperties } from 'react'

export function TitleBar({ title, theme, maximized, onToggleTheme }: {
  title: string; theme: 'light' | 'dark'; maximized: boolean; onToggleTheme: () => void
}) {
  return <header className="title-bar" style={{ WebkitAppRegion: 'drag' } as CSSProperties} aria-label={`${title} window`}>
    <div className="window-controls" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
      <div className="segment" role="group" aria-label="Colour theme">
        <button aria-pressed={theme === 'light'} onClick={() => theme !== 'light' && onToggleTheme()}>Light</button>
        <button aria-pressed={theme === 'dark'} onClick={() => theme !== 'dark' && onToggleTheme()}>Dark</button>
      </div>
      <button className="window-button" aria-label="Minimize" onClick={() => window.switchoid.windowMinimize()}><Minus size={19} /></button>
      <button className="window-button" aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => window.switchoid.windowToggleMaximize()}>{maximized ? <Copy size={16} /> : <Square size={16} />}</button>
      <button className="window-button window-close" aria-label="Close window" onClick={() => window.switchoid.windowClose()}><X size={20} /></button>
    </div>
  </header>
}
