import { stat } from 'node:fs/promises'
import { readImagePreview } from './image'

const previews = new Map<string, { version: string; result: Promise<string | null> }>()

export async function readCachedPreview(path: string): Promise<string | null> {
  try {
    const info = await stat(path)
    const version = `${info.size}:${info.mtimeMs}`
    const cached = previews.get(path)
    if (cached?.version === version) {
      previews.delete(path)
      previews.set(path, cached)
      return cached.result
    }
    const result = readImagePreview(path)
    previews.delete(path)
    previews.set(path, { version, result })
    if (previews.size > 104) previews.delete(previews.keys().next().value!)
    return result
  } catch {
    previews.delete(path)
    return null
  }
}
