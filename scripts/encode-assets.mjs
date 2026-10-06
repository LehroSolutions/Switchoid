import sharp from 'sharp'
for (const name of ['landscape', 'media-art']) {
  const input = `src/renderer/src/assets/${name}.png`
  await sharp(input).webp({ quality: 88 }).toFile(`src/renderer/src/assets/${name}.webp`)
}
