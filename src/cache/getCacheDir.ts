import path from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

export function getCacheDir(): string {
    const env = process.env.CACHE_DIR
    const scriptDir = path.dirname(fileURLToPath(import.meta.url))
    // Default: project-root/cache (assuming src/cache/getCacheDir.ts)
    const defaultCacheDir = path.join(scriptDir, '..', '..', 'cache')
    if (!env) return defaultCacheDir
    return path.isAbsolute(env) ? env : path.join(scriptDir, '..', '..', env)
}
