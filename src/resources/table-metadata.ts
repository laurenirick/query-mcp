import { Pool } from 'pg'
import { listTables, getTableSchema } from '../db/table-metadata.js'

export async function handleListResources(pool: Pool, schema = 'public', refresh = false) {
    const tables = await listTables(pool, schema, refresh)
    // Return as MCP contents array, one per table
    return {
        contents: tables.map(table => ({
            uri: `table-metadata://${table}`,
            mimeType: 'application/json',
            text: JSON.stringify({ name: table }, null, 2),
        })),
    }
}

export async function handleReadResource(pool: Pool, request: any, schema = 'public', refresh = false) {
    // Expect URI like /table-metadata/{table}
    const uri: string = request.params.uri
    const match = uri.match(/^table-metadata:\/\/(.+)$/)
    if (!match) {
        return { error: 'Invalid table-metadata URI', uri }
    }
    const table = match[1]
    const tableSchema = await getTableSchema(pool, table, schema, refresh)
    return {
        columns: tableSchema.columns,
        relationships: tableSchema.relationships,
        samples: tableSchema.samples,
        columnStats: tableSchema.columnStats,
    }
}
