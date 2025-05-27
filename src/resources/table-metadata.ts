import { Pool } from 'pg'
import { listTables, getTableSchema } from '../db/table-metadata.js'

export async function handleListResources(pool: Pool, schema = 'public') {
    const tables = await listTables(pool, schema)
    if ((tables as any).error) {
        return {
            contents: [],
            error: (tables as any).error,
        }
    }
    // Return as MCP contents array, one per table
    return {
        contents: (tables as string[]).map((table: string) => ({
            uri: `table-metadata://${table}`,
            mimeType: 'application/json',
            text: JSON.stringify({ name: table }, null, 2),
        })),
    }
}

export async function handleReadResource(pool: Pool, request: any, schema = 'public') {
    // Expect URI like /table-metadata/{table}
    const uri: string = request.params.uri
    const match = uri.match(/^table-metadata:\/\/(.+)$/)
    if (!match) {
        return { error: 'Invalid table-metadata URI', uri }
    }
    const table = match[1]
    const tableSchema = await getTableSchema(pool, table, schema)
    if (tableSchema.error) {
        return { error: tableSchema.error }
    }
    return {
        columns: tableSchema.columns,
        relationships: tableSchema.relationships,
        samples: tableSchema.samples,
        columnStats: tableSchema.columnStats,
    }
}
