/** Single source of truth for channel names shared by main and preload. */
export const IPC = {
  engineStatus: 'engine:status',
  appMetrics: 'engine:metrics',
  pickFiles: 'files:pick',
  addPaths: 'files:add',
  readPreview: 'files:preview',
  convert: 'convert:start',
  cancel: 'convert:cancel',
  showInFolder: 'shell:show',
  openPath: 'shell:open',
  history: 'history:list',
  clearHistory: 'history:clear',
  settings: 'settings:get',
  saveSettings: 'settings:save',
  presets: 'presets:list',
  savePreset: 'presets:save',
  deletePreset: 'presets:delete',
  chooseOutputDir: 'settings:outdir',
  jobUpdate: 'queue:job',
  queueDone: 'queue:done',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowState: 'window:state'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
