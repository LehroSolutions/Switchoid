import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, writeFile, appendFile, rename, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { root, recipeFiles, sourceLock, sourceBundle, recordMediaPack, verifyMediaPack } from './media-pack.mjs'

const resources = join(root, 'resources')
await verifyMediaPack(join(resources, 'bin'), join(resources, 'ffmpeg'))
const cache = join(root, '.cache')
await mkdir(cache, { recursive: true })
const temporary = await mkdtemp(join(cache, 'media-integrity-'))
const bin = join(temporary, 'bin')
const notices = join(temporary, 'notices')
try {
  await cp(join(resources, 'bin'), bin, { recursive: true })
  await cp(join(resources, 'ffmpeg'), notices, { recursive: true })
  const manifestPath = join(notices, 'provenance.json')
  const originalManifest = await readFile(manifestPath)
  const changedRecipe = JSON.parse(originalManifest)
  changedRecipe.recipeSha256 = '0'.repeat(64)
  await writeFile(manifestPath, JSON.stringify(changedRecipe))
  await assert.rejects(verifyMediaPack(bin, notices, { execute: false }), /Engine recipe changed/)
  await writeFile(manifestPath, originalManifest)

  await appendFile(join(bin, 'ffprobe.exe'), 'altered')
  await assert.rejects(verifyMediaPack(bin, notices, { execute: false }), /Media resources were changed or incomplete/)
  await cp(join(resources, 'bin', 'ffprobe.exe'), join(bin, 'ffprobe.exe'))

  await rename(join(notices, 'FFmpeg-LICENSE.txt'), join(temporary, 'removed-license.txt'))
  await recordMediaPack(bin, notices)
  await assert.rejects(verifyMediaPack(bin, notices, { execute: false }), /Missing notices\/FFmpeg-LICENSE.txt/)
  await rename(join(temporary, 'removed-license.txt'), join(notices, 'FFmpeg-LICENSE.txt'))

  const inputs = join(temporary, 'inputs')
  await mkdir(inputs)
  execFileSync('tar', ['-xzf', join(notices, sourceBundle), '-C', inputs,
    ...recipeFiles.map(name => `recipe/${name}`), ...sourceLock.sources.map(source => `archives/${source.file}`)], { windowsHide: true })
  await writeFile(join(inputs, 'archives', sourceLock.sources.find(source => source.name === 'ffmpeg').file), 'wrong source')
  execFileSync('tar', ['-czf', join(notices, sourceBundle), '-C', inputs, 'archives', 'recipe'], { windowsHide: true })
  await recordMediaPack(bin, notices)
  await assert.rejects(verifyMediaPack(bin, notices, { execute: false }), /Missing\/mismatched ffmpeg source/)
  console.log('PASS media integrity: rejects changed recipe, binary tampering, missing license, and substituted source even with refreshed provenance')
} finally {
  const target = resolve(temporary)
  if (dirname(target) !== resolve(cache) || !basename(target).startsWith('media-integrity-')) throw new Error('Unsafe test cleanup path')
  await rm(target, { recursive: true, force: true })
}
