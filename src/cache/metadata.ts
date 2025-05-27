import { promises as fs } from 'fs'
import path from 'path'
import { getCacheDir } from './getCacheDir.js'

const CACHE_DIR = getCacheDir()

function getTableCacheFile(schema: string, table: string) {
    return path.join(CACHE_DIR, schema, `${table}.json`)
}

function getSchemaDir(schema: string) {
    return path.join(CACHE_DIR, schema)
}

export async function readTableMetadataCache(schema = 'public', table?: string): Promise<any | null> {
    if (!table) {
        // List all tables for this schema
        try {
            const dir = getSchemaDir(schema)
            const files = await fs.readdir(dir)
            return files.filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''))
        } catch {
            return null
        }
    } else {
        // Read specific table
        try {
            const file = getTableCacheFile(schema, table)
            const data = await fs.readFile(file, 'utf-8')
            return JSON.parse(data)
        } catch {
            return null
        }
    }
}

export async function writeTableMetadataCache(table: string, metadata: any, schema = 'public'): Promise<void> {
    const dir = getSchemaDir(schema)
    await fs.mkdir(dir, { recursive: true })
    const file = getTableCacheFile(schema, table)
    await fs.writeFile(file, JSON.stringify(metadata, null, 2), 'utf-8')
}

export async function clearTableMetadataCache(schema?: string, table?: string): Promise<void> {
    try {
        if (schema && table) {
            await fs.unlink(getTableCacheFile(schema, table))
        } else if (schema) {
            const dir = getSchemaDir(schema)
            const files = await fs.readdir(dir)
            await Promise.all(files.map(f => fs.unlink(path.join(dir, f))))
        } else {
            const schemas = await fs.readdir(CACHE_DIR)
            await Promise.all(schemas.map(s => clearTableMetadataCache(s)))
        }
    } catch {
        // Ignore if file/dir does not exist
    }
}
