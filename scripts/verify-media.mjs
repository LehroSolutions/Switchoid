import { join } from 'node:path'
import { root, verifyMediaPack } from './media-pack.mjs'

const resourceRoot = process.argv[2] || join(root, 'resources')
const packaged = process.argv.includes('--packaged')
const manifest = await verifyMediaPack(join(resourceRoot, 'bin'), join(resourceRoot, packaged ? 'licenses/ffmpeg' : 'ffmpeg'))
console.log(`PASS ${manifest.version} media package: ${manifest.sources.length} source archives, matching recipe, notices, integrity, and required conversion capabilities`)
