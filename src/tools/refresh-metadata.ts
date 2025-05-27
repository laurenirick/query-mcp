import { Pool } from 'pg'
import { refreshTableMetadata } from '../db/table-metadata.js'

export async function handleRefreshMetadata(pool: Pool, schema = 'public') {
    // Fire and forget
    refreshTableMetadata(pool, schema)
    return { success: true, message: 'Metadata refresh started.' }
}
