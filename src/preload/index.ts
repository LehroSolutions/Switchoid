import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC } from '@shared/ipc'
import type {
  AppMetrics,
  AppSettings,
  ConversionJob,
  ConvertRequest,
  EngineStatus,
  HistoryEntry,
  MediaFileMeta,
  Preset,
  SwitchoidApi
} from '@shared/types'

/** Wrap a main→renderer push channel; returns an unsubscribe function. */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: SwitchoidApi = {
  engineStatus: () => ipcRenderer.invoke(IPC.engineStatus) as Promise<EngineStatus>,
  appMetrics: () => ipcRenderer.invoke(IPC.appMetrics) as Promise<AppMetrics>,
  pickFiles: () => ipcRenderer.invoke(IPC.pickFiles) as Promise<MediaFileMeta[]>,
  addPaths: (paths) => ipcRenderer.invoke(IPC.addPaths, paths) as Promise<MediaFileMeta[]>,
  readPreview: (path) => ipcRenderer.invoke(IPC.readPreview, path) as Promise<string | null>,
  // File.path was removed in Electron 32; webUtils is the supported route.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  convert: (req: ConvertRequest) => ipcRenderer.invoke(IPC.convert, req),
  cancel: (jobId) => ipcRenderer.invoke(IPC.cancel, jobId) as Promise<void>,
  showInFolder: (path) => ipcRenderer.invoke(IPC.showInFolder, path) as Promise<void>,
  openPath: (path) => ipcRenderer.invoke(IPC.openPath, path) as Promise<void>,
  history: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IPC.history) as Promise<HistoryEntry[]>,
  clearHistory: () => ipcRenderer.invoke(IPC.clearHistory) as Promise<HistoryEntry[]>,
  settings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settings) as Promise<AppSettings>,
  saveSettings: (s: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.saveSettings, s) as Promise<AppSettings>,
  presets: (): Promise<Preset[]> => ipcRenderer.invoke(IPC.presets) as Promise<Preset[]>,
  savePreset: (p: Preset): Promise<Preset[]> => ipcRenderer.invoke(IPC.savePreset, p) as Promise<Preset[]>,
  deletePreset: (id: string): Promise<Preset[]> => ipcRenderer.invoke(IPC.deletePreset, id) as Promise<Preset[]>,
  chooseOutputDir: () => ipcRenderer.invoke(IPC.chooseOutputDir) as Promise<string | undefined>,
  onJobUpdate: (cb) => subscribe<ConversionJob>(IPC.jobUpdate, cb),
  onQueueDone: (cb) => subscribe<{ done: number; failed: number }>(IPC.queueDone, cb),

  windowMinimize: () => ipcRenderer.invoke(IPC.windowMinimize) as Promise<void>,
  windowToggleMaximize: () => ipcRenderer.invoke(IPC.windowToggleMaximize) as Promise<boolean>,
  windowClose: () => ipcRenderer.invoke(IPC.windowClose) as Promise<void>,
  onWindowState: (cb) => subscribe<boolean>(IPC.windowState, cb)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('switchoid', api)
} else {
  // @ts-expect-error dev fallback when context isolation is disabled
  window.switchoid = api
}
