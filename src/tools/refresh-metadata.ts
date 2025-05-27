import { Pool } from 'pg'
import { refreshTableMetadata } from '../db/table-metadata.js'

export async function handleRefreshMetadata(pool: Pool) {
    await refreshTableMetadata(pool)
    return { success: true, message: 'Metadata cache refreshed.' }
}
