import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, readdir, writeFile, lstat } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const recipeDir = join(root, 'scripts', 'media')
export const recipeFiles = ['Dockerfile', 'LICENSE', 'README.md', 'build-dependencies.sh', 'build-ffmpeg.sh', 'build.sh', 'sources.lock.json']
export const sourceLock = JSON.parse(await readFile(join(recipeDir, 'sources.lock.json'), 'utf8'))
export const sourceBundle = 'FFmpeg-corresponding-source.tar.gz'
const recipeHash = createHash('sha256')
for (const name of recipeFiles) {
  const bytes = await readFile(join(recipeDir, name))
  recipeHash.update(`${name}\0${bytes.length}\0`).update(bytes)
}
export const recipeSha256 = recipeHash.digest('hex')

export async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function walk(dir, prefix = '') {
  const files = []
  for (const name of (await readdir(dir)).sort()) {
    const path = join(dir, name)
    const info = await lstat(path)
    assert.ok(!info.isSymbolicLink(), `Unexpected resource symlink: ${path}`)
    if (info.isDirectory()) files.push(...await walk(path, `${prefix}${name}/`))
    else files.push({ path: `${prefix}${name}`, sha256: await sha256(path), bytes: info.size })
  }
  return files
}

async function hashArchiveEntry(archive, entry) {
  const child = spawn('tar', ['-xOf', archive, entry], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const hash = createHash('sha256')
  let errorOutput = ''
  child.stderr.on('data', chunk => { errorOutput = (errorOutput + chunk).slice(-4096) })
  const completion = new Promise((resolveExit, reject) => {
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolveExit() : reject(new Error(`Source extraction failed: ${errorOutput}`)))
  })
  await Promise.all([(async () => { for await (const chunk of child.stdout) hash.update(chunk) })(), completion])
  return hash.digest('hex')
}

export async function recordMediaPack(bin, notices) {
  const files = [
    ...await walk(bin, 'bin/'),
    ...(await walk(notices, 'notices/')).filter(file => file.path !== 'notices/provenance.json')
  ]
  await writeFile(join(notices, 'provenance.json'), JSON.stringify({
    schemaVersion: 1, target: 'win32-x64', version: sourceLock.ffmpegVersion,
    license: 'GPL-3.0-or-later', recipeSha256, sourceBundle,
    sources: sourceLock.sources, files
  }, null, 2) + '\n')
}

export async function verifyMediaPack(bin, notices, { execute = process.platform === 'win32' } = {}) {
  const manifest = JSON.parse(await readFile(join(notices, 'provenance.json'), 'utf8'))
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.target, 'win32-x64')
  assert.equal(manifest.version, sourceLock.ffmpegVersion)
  assert.equal(manifest.license, 'GPL-3.0-or-later')
  assert.equal(manifest.recipeSha256, recipeSha256, 'Engine recipe changed; rebuild with media:prepare')
  assert.equal(manifest.sourceBundle, sourceBundle)
  assert.deepEqual(manifest.sources, sourceLock.sources)
  const actual = [
    ...await walk(bin, 'bin/'),
    ...(await walk(notices, 'notices/')).filter(file => file.path !== 'notices/provenance.json')
  ]
  assert.deepEqual(actual, manifest.files, 'Media resources were changed or incomplete')
  assert.deepEqual(actual.filter(file => file.path.startsWith('bin/')).map(file => file.path), ['bin/ffmpeg.exe', 'bin/ffprobe.exe'], 'Unexpected bundled executable or DLL')
  const required = ['bin/ffmpeg.exe', 'bin/ffprobe.exe', `notices/${sourceBundle}`,
    'notices/FFmpeg-LICENSE.txt', 'notices/FFmpeg-BUILD.txt', 'notices/SOURCE-README.md',
    'notices/sources.lock.json', 'notices/build-evidence/configure-command.txt',
    'notices/build-evidence/config.log', 'notices/build-evidence/config.mak',
    'notices/build-evidence/compiler.txt', 'notices/build-evidence/toolchain-packages.txt',
    'notices/build-evidence/ffmpeg-imports.txt', 'notices/build-evidence/ffprobe-imports.txt',
    'notices/licenses/MinGW-w64-copyright',
    'notices/licenses/GCC-runtime-copyright', 'notices/licenses/zlib-LICENSE']
  for (const path of required) assert.ok(actual.some(file => file.path === path), `Missing ${path}`)
  for (const source of sourceLock.sources.filter(source => !['ffmpeg', 'zlib'].includes(source.name))) {
    assert.ok(actual.some(file => file.path.startsWith(`notices/licenses/${source.name}/`)), `Missing ${source.name} notices`)
  }
  const archive = join(notices, sourceBundle)
  for (const name of recipeFiles) {
    const expected = createHash('sha256').update(await readFile(join(recipeDir, name))).digest('hex')
    assert.equal(await hashArchiveEntry(archive, `recipe/${name}`), expected, `Source recipe mismatch: ${name}`)
  }
  for (const source of sourceLock.sources) {
    assert.match(source.file, /^[a-zA-Z0-9._-]+$/)
    assert.match(source.sha256, /^[a-f0-9]{64}$/)
    assert.equal(await hashArchiveEntry(archive, `archives/${source.file}`), source.sha256, `Missing/mismatched ${source.name} source`)
  }
  if (execute) {
    const run = (name, args) => execFileSync(join(bin, `${name}.exe`), ['-hide_banner', ...args], {
      windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
    })
    for (const name of ['ffmpeg', 'ffprobe']) {
      assert.ok(run(name, ['-version']).startsWith(`${name} version ${sourceLock.ffmpegVersion}`), 'Wrong engine version')
    }
    const config = run('ffmpeg', ['-version'])
    assert.ok(config.includes('--disable-autodetect') && config.includes('--enable-gpl') && config.includes('--enable-version3'))
    assert.ok(!config.includes('--enable-nonfree'), 'Nonfree media build cannot be distributed')
    const external = [...config.matchAll(/--enable-lib([a-z0-9]+)/g)].map(match => match[1]).sort()
    assert.deepEqual(external, ['dav1d', 'mp3lame', 'opus', 'vorbis', 'vpx', 'x264'], 'Unaccounted external library')
    const encoders = run('ffmpeg', ['-encoders'])
    for (const codec of ['libx264', 'libvpx-vp9', 'libmp3lame', 'libopus', 'libvorbis', 'aac', 'flac', 'pcm_s16le', 'gif', 'mpeg4', 'png']) {
      assert.match(encoders, new RegExp(`\\s${codec}\\s`), `Missing encoder ${codec}`)
    }
    const filters = run('ffmpeg', ['-filters'])
    for (const filter of ['scale', 'fps', 'setpts', 'palettegen', 'paletteuse', 'loudnorm', 'afade']) {
      assert.match(filters, new RegExp(`\\s${filter}\\s`), `Missing filter ${filter}`)
    }
  }
  return manifest
}
