import { Pool } from 'pg'
import { refreshTableMetadata } from '../db/table-metadata.js'

export async function handleRefreshMetadata(pool: Pool, schema = 'public', table?: string) {
    // Fire and forget
    refreshTableMetadata(pool, schema, table)
    if (table) {
        return { success: true, message: `Metadata refresh started for table: ${table}` }
    }
    return { success: true, message: 'Metadata refresh started.' }
}
