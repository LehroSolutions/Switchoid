import { memo, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { FolderOpen, Plus, Play, Loader2, Trash2, ImageIcon, Music4, Film, Video, MoreHorizontal } from 'lucide-react'
import type { AppMetrics, Preset } from '@shared/types'
import { useStore } from '../store'
import { Button } from './ui'
import { QueueList } from './FileList'

const PerfCard = memo(function PerfCard({ ok, note }: { ok: boolean; note: string }) {
  const [sample, setSample] = useState<{ metrics: AppMetrics | null; points: number[] }>({ metrics: null, points: [] })
  useEffect(() => {
    let alive = true
    let pending = false
    const tick = async () => {
      if (document.hidden || pending) return
      pending = true
      try {
        const metrics = await window.switchoid.appMetrics()
        if (alive) setSample(s => ({ metrics, points: [...s.points.slice(-27), metrics.cpuPercent] }))
      } catch { /* Keep the last available reading. */ }
      finally { pending = false }
    }
    void tick()
    const timer = window.setInterval(tick, 2500)
    document.addEventListener('visibilitychange', tick)
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const { metrics, points } = sample
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${i * 100 / Math.max(1, points.length - 1)} ${48 - p * .45}`).join(' ')
  return <section className="performance-card tile" aria-label="Performance">
    <div className="performance-top">
      <svg viewBox="0 0 100 50" aria-hidden="true"><defs><linearGradient id="cpu-fill" x2="0" y2="1"><stop stopColor="#25edff" stopOpacity=".5" /><stop offset="1" stopColor="#25edff" stopOpacity="0" /></linearGradient></defs>
        <path d={`${path} L100 50 L0 50 Z`} fill="url(#cpu-fill)" /><path d={path} fill="none" stroke="#2af0ff" strokeWidth="1.3" />
      </svg>
      <div><strong>{ok ? 'High Performance' : 'Image Engine Ready'}</strong><p title={note}>{ok ? 'Using Local Engine' : 'FFmpeg unavailable'}</p></div>
    </div>
    <dl className="performance-stats">
      <div><dt>CPU</dt><dd>{metrics ? `${metrics.cpuPercent}%` : '—'}</dd></div>
      <div><dt>Processes</dt><dd>{metrics?.processes ?? '—'}</dd></div>
      <div><dt>RAM</dt><dd>{metrics ? metrics.memoryMB >= 1024 ? `${(metrics.memoryMB / 1024).toFixed(1)} GB` : `${metrics.memoryMB} MB` : '—'}</dd></div>
    </dl>
  </section>
})

const PRESET_ICONS = { image: ImageIcon, audio: Music4, gif: Film, video: Video, any: Film }
export function RightRail({ onStart, onApplyPreset, onChooseDir, onNewPreset }: {
  onStart: () => void; onApplyPreset: (p: Preset) => void; onChooseDir: () => void; onNewPreset: () => void
}) {
  const { presets, engine, files, jobs, busy, outputDir } = useStore(useShallow(s => ({ presets: s.presets, engine: s.engine, files: s.files, jobs: s.jobs, busy: s.converting, outputDir: s.settings?.outputDir })))
  const featuredIds = ['img-social', 'gif-480', 'aud-mp3-320', 'vid-mp4-1080']
  const featured = [...presets.filter(p => !p.builtin), ...featuredIds.map(id => presets.find(p => p.id === id)).filter((p): p is Preset => Boolean(p))].slice(0, 4)
  const clearable = jobs.some(j => j.status !== 'queued' && j.status !== 'running')
  return <aside className="right-rail">
    <PerfCard ok={Boolean(engine?.ffmpeg.available)} note={engine?.ffmpeg.version ?? engine?.ffmpeg.error ?? 'Checking local engine…'} />
    <section className="queue-panel tile" aria-label="Conversion queue">
      <header className="rail-heading"><h2>Conversion Queue</h2><span className="queue-count">{jobs.length}</span></header>
      <QueueList jobs={jobs} />
      {!jobs.length && <div className="queue-empty"><Film size={30} strokeWidth={1.2} /><strong>Your next creation starts here</strong><p>Add images, video or audio.<br />Your conversions stay on this device.</p></div>}
      <Button size="sm" className="clear-queue" disabled={!clearable} onClick={() => useStore.setState(s => ({ jobs: s.jobs.filter(j => j.status === 'running' || j.status === 'queued') }))}><Trash2 size={14} />Clear Queue</Button>
    </section>
    <section className="presets-panel tile" aria-label="Presets">
      <header className="rail-heading"><h2>Presets</h2><Button size="sm" onClick={onNewPreset}><Plus size={16} />New</Button></header>
      <ul className="preset-list">{featured.map(p => {
        const Icon = PRESET_ICONS[p.kind]
        return <li key={p.id}><button onClick={() => onApplyPreset(p)} className="preset-item"><span className={`preset-icon preset-${p.kind}`}><Icon size={20} /></span><span className="preset-copy"><strong>{p.name}</strong><small>{p.hint}</small></span><MoreHorizontal size={18} aria-hidden="true" /></button></li>
      })}</ul>
    </section>
    <div className="conversion-action">
      <button className="output-folder" onClick={onChooseDir} title={outputDir ?? 'Choose output folder'}><FolderOpen size={14} /><span>{outputDir ? outputDir.split(/[\\/]/).pop() : 'Save to Downloads / Switchoid'}</span></button>
      <Button variant="primary" className="start-conversion" disabled={busy} onClick={onStart} aria-describedby="start-hint">
        {busy ? <Loader2 size={23} className="animate-spin" /> : <Play size={23} fill="currentColor" />}{busy ? 'Converting…' : 'Start Conversion'}
      </Button>
      <p id="start-hint">{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} ready · ${busy ? 'Working locally' : 'Ready to convert'}` : 'Add files to get started'}</p>
    </div>
  </aside>
}
