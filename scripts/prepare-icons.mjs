import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(join(root, 'build', 'brand-source.svg'))
const build = join(root, 'build')
const publicDir = join(root, 'src', 'renderer', 'public')
await mkdir(publicDir, { recursive: true })
const master = await sharp(source).resize(512, 512).png().toBuffer()
await writeFile(join(build, 'icon.png'), master)
await writeFile(join(publicDir, 'favicon.svg'), source)
await sharp(master).resize(32, 32).png().toFile(join(publicDir, 'favicon.png'))

// Windows ICO supports PNG frames; include sizes used by Explorer and the taskbar.
const sizes = [16, 24, 32, 48, 64, 128, 256]
const frames = await Promise.all(sizes.map(size => sharp(master).resize(size, size).png().toBuffer()))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
frames.forEach((frame, i) => {
  const entry = 6 + i * 16
  directory[entry] = sizes[i] === 256 ? 0 : sizes[i]
  directory[entry + 1] = directory[entry]
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(frame.length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += frame.length
})
await writeFile(join(build, 'icon.ico'), Buffer.concat([directory, ...frames]))
console.log('Generated Windows icon (7 sizes), 512px window icon, and SVG/PNG favicons.')
