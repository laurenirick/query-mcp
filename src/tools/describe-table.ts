import { DatabaseAdapter } from '../db/adapter.js'

export async function handleDescribeTable(db: DatabaseAdapter, table: string, schema = 'public') {
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
