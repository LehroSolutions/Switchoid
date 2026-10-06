import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
const require = createRequire(import.meta.url)
const { _electron: electron } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const userData = mkdtempSync(join(tmpdir(), 'switchoid-ui-'))
mkdirSync('artifacts', { recursive: true })
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE
const app = await electron.launch({ executablePath: resolve('node_modules/electron/dist/electron.exe'), args: ['.', `--user-data-dir=${userData}`, '--force-device-scale-factor=1'], env })
try {
  const page = await app.firstWindow()
  page.on('pageerror', e => console.log('PAGE ERROR', e.message))
  await page.getByRole('heading', { name: 'Convert Anything' }).waitFor()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1536, 1024))
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'artifacts/dashboard-dark.png' })
  console.log(JSON.stringify(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.querySelector('main').scrollHeight, client: document.querySelector('main').clientHeight, text: document.body.innerText.slice(-1100) }))))
} finally { await app.close() }
