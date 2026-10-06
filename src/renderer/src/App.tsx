import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { NavRail } from './components/NavRail'
import { TitleBar } from './components/TitleBar'
import { Backdrop } from './components/Backdrop'
import { ConvertDashboard } from './components/ConvertDashboard'
import { RightRail } from './components/RightRail'
import { useStore, type View } from './store'
import type { MediaFileMeta, Preset } from '@shared/types'

const BatchView = lazy(() => import('./views/BatchView').then(m => ({ default: m.BatchView })))
const PresetsView = lazy(() => import('./views/PresetsView').then(m => ({ default: m.PresetsView })))
const HistoryView = lazy(() => import('./views/HistoryView').then(m => ({ default: m.HistoryView })))
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))
const TITLES: Record<View, string> = { convert: 'Convert', batch: 'Batch', presets: 'Presets', history: 'History', settings: 'Settings' }
const resolveTheme = (pref: 'light' | 'dark' | 'system') => pref === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref

export default function App() {
  const { view, theme, settings, setView } = useStore(useShallow(s => ({ view: s.view, theme: s.theme, settings: s.settings, setView: s.setView })))
  const [dragging, setDragging] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const importing = useRef(false)

  useEffect(() => {
    let alive = true
    Promise.all([window.switchoid.engineStatus(), window.switchoid.presets(), window.switchoid.settings(), window.switchoid.history()])
      .then(([engine, presets, settings, history]) => {
        if (alive) useStore.setState({ engine, presets, settings, history, theme: resolveTheme(settings.theme) })
      }).catch(err => { if (alive) setError(`Unable to load application data: ${String(err)}`) })
    const offJob = window.switchoid.onJobUpdate(job => useStore.getState().upsertJob(job))
    const offDone = window.switchoid.onQueueDone(() => {
      useStore.getState().setConverting(false)
      window.switchoid.history().then(history => { if (alive) useStore.getState().setHistory(history) }).catch(() => {})
    })
    const offWin = window.switchoid.onWindowState(setMaximized)
    return () => { alive = false; offJob(); offDone(); offWin() }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (settings?.theme === 'system') useStore.setState({ theme: resolveTheme('system') }) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme, settings?.theme])

  useEffect(() => {
    if (settings) useStore.setState({ theme: resolveTheme(settings.theme) })
  }, [settings?.theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => document.documentElement.classList.toggle('app-reduce-motion', Boolean(settings?.reduceMotion) || mq.matches)
    sync(); mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [settings?.reduceMotion])

  const add = useCallback((files: MediaFileMeta[]) => {
    const s = useStore.getState()
    s.addFiles(files)
    const kinds = new Set(files.map(f => f.kind))
    if (kinds.size === 1) s.setTab(files[0].kind)
    if (files.length) s.setView('convert')
  }, [])
  const acceptPaths = useCallback(async (paths: string[]) => {
    if (importing.current) return
    importing.current = true
    setError(null)
    try { add(await window.switchoid.addPaths(paths)) }
    catch (err) { setError(`Unable to add files: ${String(err)}`) }
    finally { importing.current = false }
  }, [add])
  const browse = useCallback(async () => {
    setError(null)
    try { add(await window.switchoid.pickFiles()) }
    catch (err) { setError(`Unable to open files: ${String(err)}`) }
  }, [add])

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files')
    const enter = (e: DragEvent) => { if (hasFiles(e)) { e.preventDefault(); depth++; setDragging(true) } }
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setDragging(false) } }
    const drop = (e: DragEvent) => {
      depth = 0; setDragging(false)
      if (!hasFiles(e)) return
      e.preventDefault()
      const paths = [...(e.dataTransfer?.files ?? [])].map(file => window.switchoid.getPathForFile(file)).filter(Boolean)
      if (paths.length) void acceptPaths(paths)
    }
    window.addEventListener('dragenter', enter); window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave); window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop)
    }
  }, [acceptPaths])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    useStore.setState({ theme: next })
    window.switchoid.saveSettings({ theme: next }).then(useStore.getState().setSettings).catch(err => setError(String(err)))
  }
  const start = async () => {
    const s = useStore.getState()
    if (s.converting) return
    if (!s.files.length) { await browse(); return }
    s.setConverting(true); setError(null)
    try { await window.switchoid.convert({ paths: s.files.map(f => f.path), options: s.optionsOf(s.tab), outputDir: s.settings?.outputDir }) }
    catch (err) { setError(`Conversion could not start: ${String(err)}`) }
    finally { useStore.getState().setConverting(false) }
  }
  const chooseDir = async () => {
    try {
      const outputDir = await window.switchoid.chooseOutputDir()
      if (outputDir) useStore.getState().setSettings(await window.switchoid.saveSettings({ outputDir }))
    } catch (err) { setError(String(err)) }
  }
  const applyPreset = (p: Preset) => { useStore.getState().applyPreset(p); setView('convert') }

  return <div className={`app-shell ${maximized ? 'is-maximized' : ''}`}>
    <Backdrop />
    <TitleBar title={TITLES[view]} theme={theme} maximized={maximized} onToggleTheme={toggleTheme} />
    <div className="app-layout">
      <NavRail view={view} onNavigate={setView} />
      <main className="main-content">
        {error && <div role="alert" className="app-error">{error}<button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}
        <Suspense fallback={<p className="view-loading" role="status">Loading {TITLES[view].toLowerCase()}…</p>}>
          {view === 'convert' && <ConvertDashboard dragging={dragging} onBrowse={browse} />}
          {view === 'batch' && <BatchView />}
          {view === 'presets' && <PresetsView onApply={applyPreset} />}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && <SettingsView />}
        </Suspense>
      </main>
      <RightRail onStart={start} onApplyPreset={applyPreset} onChooseDir={chooseDir} onNewPreset={() => setView('presets')} />
    </div>
    <PreviewLoader />
  </div>
}

function PreviewLoader() {
  const { files, history } = useStore(useShallow(s => ({ files: s.files, history: s.history })))
  useEffect(() => {
    let stopped = false
    const paths = [...new Set([
      ...files.filter(f => f.kind === 'image').slice(0, 80).map(f => f.path),
      ...history.filter(h => h.kind === 'image').slice(0, 24).map(h => h.outPath)
    ])]
    const run = async () => {
      for (const path of paths) {
        if (stopped) return
        if (useStore.getState().previews[path]) continue
        try {
          const url = await window.switchoid.readPreview(path)
          if (!stopped && url) useStore.getState().setPreview(path, url)
        } catch { /* Unsupported or removed images keep their type icon. */ }
      }
    }
    void run()
    return () => { stopped = true }
  }, [files, history])
  return null
}
