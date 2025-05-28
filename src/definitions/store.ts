import { promises as fs } from 'fs'
import path from 'path'
import { getCacheDir } from '../cache/getCacheDir.js'

const CACHE_DIR = getCacheDir()
const DEFINITIONS_FILE = path.join(CACHE_DIR, '_definitions.json')

async function readDefinitions(): Promise<Record<string, string>> {
    try {
        const data = await fs.readFile(DEFINITIONS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return {}
    }
}

async function writeDefinitions(defs: Record<string, string>): Promise<void> {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.writeFile(DEFINITIONS_FILE, JSON.stringify(defs, null, 2), 'utf-8')
}

export async function getDefinition(term: string): Promise<string | null> {
    const defs = await readDefinitions()
    return defs[term] || null
}

export async function storeDefinition(term: string, value: string): Promise<boolean> {
    const defs = await readDefinitions()
    defs[term] = value
    await writeDefinitions(defs)
    return true
}

export async function getAllDefinitions(): Promise<Record<string, string>> {
    return await readDefinitions()
}
