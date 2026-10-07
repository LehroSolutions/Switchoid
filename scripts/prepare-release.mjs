import { copyFile, readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { root, sourceBundle, sha256, verifyMediaPack } from './media-pack.mjs'

const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Unexpected release version')
const release = join(root, 'release')
const resources = join(release, 'win-unpacked', 'resources')
const notices = join(resources, 'licenses', 'ffmpeg')
await verifyMediaPack(join(resources, 'bin'), notices)
const installer = `Switchoid-Setup-${version}-x64.exe`
const source = `Switchoid-Media-Source-${version}.tar.gz`
const provenance = `Switchoid-Media-Provenance-${version}.json`
const thirdParty = `Switchoid-Third-Party-Notices-${version}.md`
await stat(join(release, installer))
await copyFile(join(notices, sourceBundle), join(release, source))
await copyFile(join(notices, 'provenance.json'), join(release, provenance))
await copyFile(join(root, 'THIRD_PARTY_NOTICES.md'), join(release, thirdParty))
for (const name of [installer, source, provenance, thirdParty]) {
  await writeFile(join(release, `${name}.sha256`), `${await sha256(join(release, name))}  ${name}\n`, 'ascii')
}
console.log('Prepared installer, corresponding source, provenance, notices, and SHA-256 checksums for release.')
