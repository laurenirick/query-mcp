import { Pool } from 'pg'
import { listTables, getTableSchema } from '../db/table-metadata.js'

export async function handleListResources(pool: Pool, refresh = false) {
    const tables = await listTables(pool, refresh)
    // Return as MCP contents array, one per table
    return {
        contents: tables.map(table => ({
            uri: `table-metadata://${table}`,
            mimeType: 'application/json',
            text: JSON.stringify({ name: table }, null, 2),
        })),
    }
}

export async function handleReadResource(pool: Pool, request: any, refresh = false) {
    // Expect URI like /table-metadata/{table}
    const uri: string = request.params.uri
    const match = uri.match(/^table-metadata:\/\/(.+)$/)
    if (!match) {
        return { error: 'Invalid table-metadata URI', uri }
    }
    const table = match[1]
    const schema = await getTableSchema(pool, table, refresh)
    return {
        columns: schema.columns,
        relationships: schema.relationships,
        samples: schema.samples,
        columnStats: schema.columnStats,
    }
}
