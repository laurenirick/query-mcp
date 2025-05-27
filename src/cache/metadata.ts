import { promises as fs } from 'fs'
import path from 'path'
import { getCacheDir } from './getCacheDir.js'

const CACHE_DIR = getCacheDir()
const TABLE_METADATA_FILE = path.join(CACHE_DIR, 'table-metadata.json')

export async function readTableMetadataCache(schema = 'public'): Promise<any | null> {
    const file = schema === 'public' ? TABLE_METADATA_FILE : path.join(CACHE_DIR, `table-metadata-${schema}.json`)
    try {
        const data = await fs.readFile(file, 'utf-8')
        return JSON.parse(data)
    } catch {
        return null
    }
}

export async function writeTableMetadataCache(metadata: any, schema = 'public'): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const file = schema === 'public' ? TABLE_METADATA_FILE : path.join(CACHE_DIR, `table-metadata-${schema}.json`)
    await fs.writeFile(file, JSON.stringify(metadata, null, 2), 'utf-8')
}

export async function clearTableMetadataCache(): Promise<void> {
    try {
        await fs.unlink(TABLE_METADATA_FILE)
    } catch {
        // Ignore if file does not exist
    }
}
