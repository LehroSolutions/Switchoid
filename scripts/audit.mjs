import { execFileSync } from 'node:child_process'
import { getCACertificates } from 'node:tls'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const env = { ...process.env }
if (!env.NODE_EXTRA_CA_CERTS) {
  const certificates = getCACertificates('system')
  if (certificates.length) {
    await mkdir(join(root, '.cache'), { recursive: true })
    const bundle = join(root, '.cache', 'audit-ca.pem')
    await writeFile(bundle, certificates.join('\n'))
    env.NODE_EXTRA_CA_CERTS = bundle
  }
}
const bun = /(?:^|[\\/])bun(?:\.exe)?$/.test(env.npm_execpath || '') ? env.npm_execpath : process.platform === 'win32' ? 'bun.exe' : 'bun'
const output = execFileSync(bun, ['audit', '--json'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const advisories = JSON.parse(output)
if (Object.keys(advisories).length) throw new Error(`Dependency advisories must be resolved: ${Object.keys(advisories).join(', ')}`)
console.log('PASS dependency audit: no advisories in the locked dependency graph')
