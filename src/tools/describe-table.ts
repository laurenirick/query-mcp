import { Pool } from 'pg'
import { getTableSchema } from '../db/table-metadata.js'

export async function handleDescribeTable(pool: Pool, table: string) {
    const schema = await getTableSchema(pool, table)
    return {
        columns: schema.columns,
        relationships: schema.relationships,
        samples: schema.samples,
        columnStats: schema.columnStats,
    }
}
