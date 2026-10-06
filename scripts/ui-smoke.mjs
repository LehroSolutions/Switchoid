import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, existsSync, copyFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import sharp from 'sharp'
const require = createRequire(import.meta.url)
const { _electron: electron } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const userData = mkdtempSync(join(tmpdir(), 'switchoid-e2e-'))
const outputDir = join(userData, 'converted')
mkdirSync(outputDir)
mkdirSync('artifacts', { recursive: true })
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
const installed = process.env.SWITCHOID_EXECUTABLE
if (installed) env.PATH = [process.env.SystemRoot, join(process.env.SystemRoot || 'C:\\Windows', 'System32')].filter(Boolean).join(';')
const app = await electron.launch({ executablePath: installed || resolve('node_modules/electron/dist/electron.exe'), args: [...(installed ? [] : ['.']), `--user-data-dir=${userData}`, '--force-device-scale-factor=1'], env })
let passed = 0
const check = (label, value) => { assert.ok(value, label); passed++; console.log(`PASS ${label}`) }
const errors = []
try {
  const page = await app.firstWindow()
  page.on('pageerror', e => errors.push(e.message))
  await page.getByRole('heading', { name: 'Convert Anything' }).waitFor()
  await page.getByRole('button', { name: /Social Media/ }).waitFor()
  check('SVG favicon is loaded', await page.locator('link[rel="icon"]').getAttribute('href') === './favicon.svg')
  const branding = await app.evaluate(({ app, nativeImage }) => ({ packaged: app.isPackaged, icon: !nativeImage.createFromPath((app.isPackaged ? process.resourcesPath : app.getAppPath() + '/build') + '/icon.png').isEmpty() }))
  check('native Windows icon asset is available', branding.icon)
  if (installed) {
    check('installed executable runs as a packaged application', branding.packaged)
    const engine = await page.evaluate(() => window.switchoid.engineStatus())
    check('installed app uses bundled FFmpeg and FFprobe without system PATH', engine.ffmpeg.available && engine.ffmpeg.ffmpegPath.includes('resources') && engine.ffmpeg.ffprobePath.includes('resources'))
  }
  const resize = (width, height) => app.evaluate(({ BrowserWindow }, { width, height }) => BrowserWindow.getAllWindows()[0].setContentSize(width, height), { width, height })
  await resize(1536, 1024)
  await page.waitForTimeout(500)
  const layout = await page.evaluate(() => {
    const main = document.querySelector('main')
    const right = document.querySelector('.right-rail')
    return { mainScroll: main.scrollHeight, mainHeight: main.clientHeight, rightScroll: right.scrollHeight, rightHeight: right.clientHeight, width: innerWidth, blur: getComputedStyle(document.querySelector('.tool-card')).backdropFilter }
  })
  console.log('Reference layout', JSON.stringify(layout))
  check('reference dashboard fits vertically', layout.mainScroll <= layout.mainHeight + 2)
  check('reference right rail fits vertically', layout.rightScroll <= layout.rightHeight + 2)
  await page.screenshot({ path: 'artifacts/dashboard-dark.png' })
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('light'))
  check('light theme persists to main process', (await page.evaluate(() => window.switchoid.settings())).theme === 'light')
  await page.screenshot({ path: 'artifacts/dashboard-light.png' })
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  for (const [width, height] of [[1280, 800], [1120, 700]]) {
    await resize(width, height)
    await page.waitForTimeout(250)
    check(`${width}px window has no horizontal overflow`, await page.evaluate(() => document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth))
    await page.screenshot({ path: `artifacts/dashboard-${width}.png` })
  }
  await resize(1536, 1024)
  await page.getByRole('button', { name: /Social Media/ }).click()
  const imageGroup = page.getByRole('radiogroup', { name: 'Image output format' })
  check('preset selects JPG', await imageGroup.getByRole('radio', { name: 'JPG', exact: true }).getAttribute('aria-checked') === 'true')
  await page.getByRole('button', { name: 'Show image options' }).click()
  const sliders = page.getByRole('slider', { name: 'Image quality', exact: true })
  check('advanced controls reflect preset quality', (await sliders.all()).length === 2 && await sliders.nth(1).inputValue() === '90')
  await sliders.nth(1).fill('76')
  check('advanced quality updates compact control', await sliders.first().inputValue() === '76')
  await page.getByRole('button', { name: 'Hide image options' }).click()
  await page.getByRole('radiogroup', { name: 'Audio output format' }).getByRole('radio', { name: 'WAV', exact: true }).click()
  check('audio format focuses audio tool', await page.locator('[data-tool="audio"]').evaluate(e => e.classList.contains('tile-active')))
  await page.getByRole('button', { name: /Social Media/ }).click()
  const source = resolve('src/renderer/src/assets/landscape.png')
  await app.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path, path] }) }, source)
  await page.evaluate(outputDir => window.switchoid.saveSettings({ outputDir }), outputDir)
  await page.getByRole('button', { name: 'Drop files here, or browse to choose files' }).click()
  await page.getByRole('heading', { name: '1 file staged' }).waitFor()
  check('file picker deduplicates paths', await page.getByRole('heading', { name: '1 file staged' }).isVisible())
  await page.getByRole('button', { name: 'Start Conversion', exact: true }).click()
  let history = []
  for (let i = 0; i < 100; i++) {
    history = await page.evaluate(() => window.switchoid.history())
    if (history.length) break
    await page.waitForTimeout(250)
  }
  check('conversion enters history', history.length === 1)
  check('image conversion writes output in chosen directory', history[0].outPath.startsWith(outputDir) && existsSync(history[0].outPath))
  const meta = await sharp(history[0].outPath).metadata()
  check('social preset produces resized JPEG', meta.format === 'jpeg' && meta.width === 1080)
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await page.locator('.recent-strip img').waitFor()
  check('recent conversion has a real thumbnail', await page.locator('.recent-strip img').count() === 1)
  await page.screenshot({ path: 'artifacts/dashboard-converted.png' })
  await page.getByRole('button', { name: 'Clear Queue', exact: true }).click()
  check('completed queue clears without deleting history', await page.locator('.queue-count').innerText() === '0' && (await page.evaluate(() => window.switchoid.history())).length === 1)

  for (const [name, heading] of [['Batch', 'Nothing staged yet'], ['Presets', 'Presets'], ['History', 'History'], ['Settings', 'Settings']]) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true }).click()
    await page.getByRole('main').getByText(heading, { exact: true }).first().waitFor()
    check(`${name} view loads`, true)
  }
  // Exercise settings-originated theme changes, not just the title bar switch.
  await page.getByRole('main').getByRole('combobox').first().selectOption('light')
  await page.waitForFunction(() => document.documentElement.classList.contains('light'))
  check('settings theme changes apply immediately', true)
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('switch', { name: 'Reduce motion', exact: true }).click()
  await page.waitForFunction(() => document.documentElement.classList.contains('app-reduce-motion'))
  check('reduced motion setting applies', true)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Convert', exact: true }).click()

  // Keep one encoder busy so a second job remains queued when cancellation arrives.
  const video = join(tmpdir(), 'switchoid-samples', 'sample.mp4')
  if (!existsSync(video)) throw new Error('Run bun run test first to generate video fixtures')
  const first = join(userData, 'first.mp4'), second = join(userData, 'second.mp4')
  copyFileSync(video, first); copyFileSync(video, second)
  const cancellation = await page.evaluate(async ({ first, second, outputDir }) => {
    await window.switchoid.saveSettings({ parallelJobs: 1 })
    let cancelId
    const off = window.switchoid.onJobUpdate(job => {
      if (job.file.path === second && job.status === 'queued') { cancelId = job.id; void window.switchoid.cancel(job.id) }
    })
    try {
      const result = await window.switchoid.convert({ paths: [first, second], outputDir, options: { kind: 'video', format: 'webm', quality: 75, aspect: 'original', fps: 30, audioCodec: 'opus', audioBitrateKbps: 128, mute: false, gifFps: 15, gifWidth: 480, speed: 1 } })
      return { canceled: result.jobs.find(j => j.id === cancelId), finished: result.jobs.find(j => j.file.path === first) }
    } finally { off() }
  }, { first, second, outputDir })
  check('queued cancellation prevents encoder startup', cancellation.canceled?.status === 'canceled' && !cancellation.canceled.startedAt && !cancellation.canceled.outPath)
  check('uncanceled queued job finishes', cancellation.finished?.status === 'done')
  await page.waitForTimeout(3000)
  check('renderer has no uncaught errors', errors.length === 0)
  const metrics = await page.evaluate(() => window.switchoid.appMetrics())
  console.log('Idle metrics', JSON.stringify(metrics))
  writeFileSync('artifacts/ui-results.json', JSON.stringify({ passed, errors, layout, metrics, userData }, null, 2))
  console.log(`${passed} Electron checks passed`)
} finally { await app.close() }
