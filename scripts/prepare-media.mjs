import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import extract from 'extract-zip'

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('The installer currently targets Windows x64.')
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, '.cache', 'media')
const bin = join(root, 'resources', 'bin')
const notices = join(root, 'resources', 'ffmpeg')
const version = '8.1.1'
const archiveName = `ffmpeg-${version}-essentials_build.zip`
const downloadUrl = `https://github.com/GyanD/codexffmpeg/releases/download/${version}/${archiveName}`
const expectedHash = '6f58ce889f59c311410f7d2b18895b33c03456463486f3b1ebc93d97a0f54541'
await Promise.all([cache, bin, notices].map(path => mkdir(path, { recursive: true })))
const exists = path => access(path).then(() => true, () => false)
const download = async (url, target) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) })
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status} ${url}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target))
}

const archive = join(cache, archiveName)
if (!await exists(archive)) { console.log(`Downloading FFmpeg ${version} from Gyan's GitHub release…`); await download(downloadUrl, archive) }
const archiveHash = createHash('sha256')
for await (const chunk of createReadStream(archive)) archiveHash.update(chunk)
const actualHash = archiveHash.digest('hex')
if (actualHash !== expectedHash) throw new Error(`FFmpeg checksum mismatch. Remove ${archive} and retry.`)
const unpacked = join(cache, `ffmpeg-${version}-essentials_build`)
if (!await exists(join(unpacked, 'bin', 'ffmpeg.exe'))) await extract(archive, { dir: cache })
await Promise.all(['ffmpeg.exe', 'ffprobe.exe'].map(name => copyFile(join(unpacked, 'bin', name), join(bin, name))))
await copyFile(join(unpacked, 'LICENSE'), join(notices, 'FFmpeg-LICENSE.txt'))
await copyFile(join(unpacked, 'README.txt'), join(notices, 'FFmpeg-BUILD.txt'))
const readme = await readFile(join(unpacked, 'README.txt'), 'utf8')
const commit = readme.match(/Source Code:\s*(https:\/\/github\.com\/FFmpeg\/FFmpeg\/commit\/([a-f0-9]+))/)
if (!commit) throw new Error('Pinned FFmpeg distribution is missing its source-code reference.')
const sourceUrl = `https://github.com/FFmpeg/FFmpeg/archive/${commit[2]}.tar.gz`
const sourceArchive = join(cache, `ffmpeg-${commit[2]}-source.tar.gz`)
if (!await exists(sourceArchive)) { console.log('Downloading matching FFmpeg source archive…'); await download(sourceUrl, sourceArchive) }
await copyFile(sourceArchive, join(notices, 'FFmpeg-source.tar.gz'))
await writeFile(join(notices, 'provenance.json'), JSON.stringify({ version, downloadUrl, archiveSha256: expectedHash, sourceUrl, provider: 'https://www.gyan.dev/ffmpeg/builds/' }, null, 2) + '\n')
for (const name of ['ffmpeg', 'ffprobe']) {
  const reported = execFileSync(join(bin, `${name}.exe`), ['-hide_banner', '-version'], { windowsHide: true, encoding: 'utf8' }).split(/\r?\n/)[0]
  console.log(reported)
}
console.log('Prepared bundled media engines, GPL license, build configuration, and matching FFmpeg source.')
