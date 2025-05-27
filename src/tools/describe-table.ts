import { Pool } from 'pg'
import { getTableSchema } from '../db/table-metadata.js'

export async function handleDescribeTable(pool: Pool, table: string, schema = 'public') {
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
