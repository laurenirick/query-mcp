import { promises as fs } from 'fs'
import path from 'path'
import { getCacheDir } from './getCacheDir.js'

const CACHE_DIR = getCacheDir()
const TABLE_METADATA_FILE = path.join(CACHE_DIR, 'table-metadata.json')

export async function readTableMetadataCache(): Promise<any | null> {
    try {
        const data = await fs.readFile(TABLE_METADATA_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return null
    }
}

export async function writeTableMetadataCache(metadata: any): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.writeFile(TABLE_METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8')
}

export async function clearTableMetadataCache(): Promise<void> {
    try {
        await fs.unlink(TABLE_METADATA_FILE)
    } catch {
        // Ignore if file does not exist
    }
}
