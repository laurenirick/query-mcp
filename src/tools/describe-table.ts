import { getTableSchema } from '../db/table-metadata.js'

export async function handleDescribeTable(table: string, schema = 'public') {
    const tableSchema = await getTableSchema(table, schema)
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
