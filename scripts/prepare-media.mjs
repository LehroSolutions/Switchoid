import { mkdir, copyFile, cp, access, rm, rename, mkdtemp } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { root, recipeDir, recipeFiles, recipeSha256, sourceLock, sha256, recordMediaPack, verifyMediaPack } from './media-pack.mjs'

if (!['win32', 'linux'].includes(process.platform) || process.arch !== 'x64') throw new Error('Media builds require Windows/Linux x64 and Docker Linux containers.')
const resources = join(root, 'resources')
const bin = join(resources, 'bin')
const notices = join(resources, 'ffmpeg')
try {
  await verifyMediaPack(bin, notices)
  console.log(`Verified bundled FFmpeg ${sourceLock.ffmpegVersion}, all codec sources, notices, and build recipe.`)
  process.exit(0)
} catch (error) {
  console.log(`Preparing media engines: ${error.message.split('\n')[0]}`)
}

const context = join(root, '.cache', 'media-build')
const archives = join(context, 'archives')
const recipe = join(context, 'recipe')
const output = join(root, '.cache', 'media-built')
await Promise.all([archives, recipe, resources].map(path => mkdir(path, { recursive: true })))
for (const name of recipeFiles) await copyFile(join(recipeDir, name), join(recipe, name))
const exists = path => access(path).then(() => true, () => false)
for (const source of sourceLock.sources) {
  const target = join(archives, source.file)
  if (!await exists(target)) {
    console.log(`Downloading pinned ${source.name} source (${source.version})…`)
    const temporary = `${target}.download`
    const response = await fetch(source.url, { signal: AbortSignal.timeout(180000) })
    if (!response.ok || !response.body) throw new Error(`Source download failed: ${response.status} ${source.url}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary))
    if (await sha256(temporary) !== source.sha256) throw new Error(`Source checksum mismatch: ${source.name}`)
    await rename(temporary, target)
  }
  if (await sha256(target) !== source.sha256) throw new Error(`Cached source checksum mismatch: ${target}`)
}
let compiledPackIsValid = false
try {
  await verifyMediaPack(join(output, 'bin'), join(output, 'notices'))
  compiledPackIsValid = true
} catch { /* A missing or changed compiled pack must be rebuilt. */ }
if (compiledPackIsValid) {
  console.log('Reusing verified compiled engines and corresponding source from the local cache.')
} else {
  console.log(`Building Windows x64 media engines from recipe ${recipeSha256.slice(0, 12)}…`)
  execFileSync('docker', ['build', '--platform', 'linux/amd64', '--file', join(recipe, 'Dockerfile'),
    '--target', 'export', '--output', `type=local,dest=${output}`, '--progress', 'plain', context], {
    windowsHide: true, stdio: 'inherit'
  })
  await recordMediaPack(join(output, 'bin'), join(output, 'notices'))
  await verifyMediaPack(join(output, 'bin'), join(output, 'notices'))
}

const staging = await mkdtemp(join(resources, '.media-stage-'))
await cp(join(output, 'bin'), join(staging, 'bin'), { recursive: true })
await cp(join(output, 'notices'), join(staging, 'ffmpeg'), { recursive: true })
await verifyMediaPack(join(staging, 'bin'), join(staging, 'ffmpeg'), { execute: false })
for (const name of ['bin', 'ffmpeg']) {
  const target = resolve(resources, name)
  if (dirname(target) !== resolve(resources) || !['bin', 'ffmpeg'].includes(name)) throw new Error('Unsafe media resource target')
  await rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 })
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(join(staging, name), target)
      break
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) throw error
      await new Promise(resolveRetry => setTimeout(resolveRetry, 500))
    }
  }
}
if (dirname(resolve(staging)) !== resolve(resources) || !staging.startsWith(join(resources, '.media-stage-'))) throw new Error('Unsafe staging path')
await rm(staging, { recursive: true, force: true })
console.log(`Prepared FFmpeg ${sourceLock.ffmpegVersion}, separate GPL executables, complete pinned codec sources, build evidence, and notices.`)
