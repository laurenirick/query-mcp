import { promises as fs } from 'fs'
import path from 'path'
import { getCacheDir } from './getCacheDir.js'

const CACHE_DIR = getCacheDir()

function getRefreshingDir(schema: string) {
    return path.join(CACHE_DIR, schema, 'refreshing')
}

function getRefreshingFile(schema: string, table: string) {
    return path.join(getRefreshingDir(schema), `_refreshing_${table}`)
}

export async function getRefreshingState(schema = 'public'): Promise<Record<string, boolean>> {
    const dir = getRefreshingDir(schema)
    try {
        const files = await fs.readdir(dir)
        const state: Record<string, boolean> = {}
        for (const file of files) {
            const match = file.match(/^_refreshing_(.+)$/)
            if (match) {
                state[match[1]] = true
            }
        }
        return state
    } catch {
        return {}
    }
}

export async function setRefreshing(schema: string, table: string): Promise<void> {
    const dir = getRefreshingDir(schema)
    await fs.mkdir(dir, { recursive: true })
    const file = getRefreshingFile(schema, table)
    await fs.writeFile(file, '', 'utf-8')
}

export async function clearRefreshing(schema: string, table: string): Promise<void> {
    const file = getRefreshingFile(schema, table)
    try {
        await fs.unlink(file)
    } catch {
        // Ignore if file does not exist
    }
}

export async function isRefreshing(schema: string, table: string): Promise<boolean> {
    const file = getRefreshingFile(schema, table)
    try {
        await fs.access(file)
        return true
    } catch {
        return false
    }
}
