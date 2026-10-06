import { app, BrowserWindow, dialog, ipcMain, shell, nativeTheme } from 'electron'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { mapConcurrent } from './pool'
import { join, basename, extname } from 'node:path'
import { ffmpegStatus } from './ffmpeg'
import { probeFile, kindForMeta } from './probe'
import { readCachedPreview } from './preview'
import { enqueue, cancelJob, onJobUpdate, onQueueDone } from './queue'
import { history, presets, settings } from './store'
import { builtinPresets } from './presets'
import type {
  AppMetrics,
  AppSettings,
  ConvertRequest,
  EngineStatus,
  MediaFileMeta,
  Preset
} from '@shared/types'
import { IPC } from '@shared/ipc'

let win: BrowserWindow | null = null

/** Extensions offered in the file dialog. */
const MEDIA_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'tif', 'bmp',
  'mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'wmv',
  'mp3', 'aac', 'wav', 'flac', 'ogg', 'opus', 'm4a', 'wma',
  'gif'
]

async function buildFileMeta(path: string): Promise<MediaFileMeta | null> {
  let st
  try {
    st = await stat(path)
  } catch {
    return null
  }
  if (!st.isFile()) return null

  const name = basename(path)
  const kind = kindForMeta(path, name)
  const probe = kind === 'image' ? null : await probeFile(path, kind)
  return {
    path,
    name,
    ext: extname(path).replace('.', '').toLowerCase(),
    kind,
    size: st.size,
    modifiedMs: st.mtimeMs,
    probe
  }
}
async function metasFor(paths: string[]): Promise<MediaFileMeta[]> {
  const metas = await mapConcurrent([...new Set(paths)], 4, buildFileMeta)
  return metas.filter((m): m is MediaFileMeta => m !== null)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1536,
    height: 1024,
    minWidth: 1120,
    minHeight: 700,
    show: false,
    frame: false,
    icon: app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'build', 'icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#08080c' : '#f6f5fb',
    webPreferences: {
      // electron-vite emits an ESM preload (.mjs) because package.json is
      // "type": "module"; sandbox must stay off for ESM preloads.
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => {
    win = null
  })

  // External links open in the real browser, never inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) win.loadURL(devUrl)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerIpc(): void {
  ipcMain.handle(IPC.engineStatus, async (): Promise<EngineStatus> => {
    const ff = await ffmpegStatus()
    return { sharp: true, ffmpeg: ff }
  })

  ipcMain.handle(IPC.appMetrics, (): AppMetrics => {
    // Real telemetry from the OS, so the performance card never invents numbers.
    const list = app.getAppMetrics()
    let cpu = 0
    let memoryKB = 0
    for (const m of list) {
      cpu += m.cpu?.percentCPUUsage ?? 0
      memoryKB += m.memory?.workingSetSize ?? 0
    }
    return {
      cpuPercent: Math.min(100, Math.max(0, Math.round(cpu))),
      memoryMB: Math.max(1, Math.round(memoryKB / 1024)),
      processes: list.length
    }
  })

  ipcMain.handle(IPC.pickFiles, async (): Promise<MediaFileMeta[]> => {
    const res = await dialog.showOpenDialog(win!, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Supported media', extensions: MEDIA_EXTENSIONS },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    return res.canceled ? [] : metasFor(res.filePaths)
  })

  ipcMain.handle(IPC.addPaths, (_e, paths: string[]): Promise<MediaFileMeta[]> => metasFor(paths))

  ipcMain.handle(IPC.readPreview, (_e, path: string): Promise<string | null> => readCachedPreview(path))

  ipcMain.handle(IPC.convert, async (_e, req: ConvertRequest) => {
    const files = await metasFor(req.paths)
    const jobs = await enqueue(req, files)
    return { jobs }
  })

  ipcMain.handle(IPC.cancel, (_e, jobId: string) => cancelJob(jobId))

  ipcMain.handle(IPC.showInFolder, (_e, path: string) => {
    if (existsSync(path)) shell.showItemInFolder(path)
  })

  ipcMain.handle(IPC.openPath, async (_e, path: string) => {
    if (!existsSync(path)) return
    const err = await shell.openPath(path)
    if (err) console.error('[main] openPath', err)
  })

  ipcMain.handle(IPC.history, () => history.list())

  ipcMain.handle(IPC.clearHistory, () => {
    history.clear()
    return []
  })

  ipcMain.handle(IPC.settings, () => settings.get())

  ipcMain.handle(IPC.saveSettings, (_e, patch: Partial<AppSettings>) => settings.save(patch))

  ipcMain.handle(IPC.presets, () => [...builtinPresets(), ...presets.list()])

  ipcMain.handle(IPC.savePreset, (_e, preset: Preset) => {
    presets.save({ ...preset, builtin: false })
    return [...builtinPresets(), ...presets.list()]
  })

  ipcMain.handle(IPC.deletePreset, (_e, id: string) => {
    presets.remove(id)
    return [...builtinPresets(), ...presets.list()]
  })

  ipcMain.handle(IPC.chooseOutputDir, async (): Promise<string | undefined> => {
    const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled) return undefined
    const dir = res.filePaths[0]
    settings.save({ outputDir: dir })
    return dir
  })

  ipcMain.handle(IPC.windowMinimize, () => {
    win?.minimize()
  })

  ipcMain.handle(IPC.windowToggleMaximize, () => {
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })

  ipcMain.handle(IPC.windowClose, () => {
    win?.close()
  })
}

/** Keep the renderer in sync with maximize/unmaximize. */
function trackWindowState(): void {
  if (!win) return
  const send = () => win?.webContents.send(IPC.windowState, win?.isMaximized() ?? false)
  win.on('maximize', send)
  win.on('unmaximize', send)
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.lehrosolutions.switchoid')
  onJobUpdate((job) => win?.webContents.send(IPC.jobUpdate, job))
  onQueueDone((summary) => win?.webContents.send(IPC.queueDone, summary))

  registerIpc()
  createWindow()
  trackWindowState()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Hardening: the renderer can never navigate the shell away from the app.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault())
})
