import { Pool } from 'pg'
import { refreshTableMetadata, resolveTablesToRefresh, getAlreadyRefreshingTables } from '../db/table-metadata.js'

export async function handleRefreshMetadata(pool: Pool, schema = 'public', table?: string) {
    const { tables, error } = await resolveTablesToRefresh(pool, schema, table)
    if (error) {
        return { success: false, error }
    }

    const alreadyRefreshing = await getAlreadyRefreshingTables(schema, tables)
    if (alreadyRefreshing.length > 0) {
        return {
            success: false,
            error: `Tables ${alreadyRefreshing.map(t => `'${t}'`).join(', ')} are already being refreshed. Please wait until they complete.`,
        }
    }

    // Fire and forget
    refreshTableMetadata(pool, schema, table)
    if (table) {
        return { success: true, message: `Metadata refresh started for table: ${table}` }
    }
    return { success: true, message: 'Metadata refresh started.' }
}
