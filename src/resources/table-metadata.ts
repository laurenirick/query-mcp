import { DatabaseAdapter } from '../db/adapter.js'

export async function handleListResources(db: DatabaseAdapter, schema = 'public') {
    const tables = await db.listTables(schema)
    // Return as MCP contents array, one per table
    return {
        contents: (tables as string[]).map((table: string) => ({
            uri: `table-metadata://${table}`,
            mimeType: 'application/json',
            text: JSON.stringify({ name: table }, null, 2),
        })),
    }
}

export async function handleReadResource(db: DatabaseAdapter, request: any, schema = 'public') {
    // Expect URI like /table-metadata/{table}
    const uri: string = request.params.uri
    const match = uri.match(/^table-metadata:\/\/(.+)$/)
    if (!match) {
        return { error: 'Invalid table-metadata URI', uri }
    }
    const table = match[1]
    const tableSchema = await db.getTableSchema(table, schema)
    if ('error' in tableSchema) {
        return { error: tableSchema.error }
    }
    return {
        columns: tableSchema.columns,
        relationships: tableSchema.relationships,
        samples: tableSchema.samples,
        columnStats: tableSchema.columnStats,
    }
}
