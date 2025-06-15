import { DatabaseAdapter } from '../db/adapter.js'

export async function handleRefreshMetadata(db: DatabaseAdapter, schema = 'public', table?: string) {
    const { tables, error } = await db.resolveTablesToRefresh(schema, table)
    if (error) {
        return { success: false, error }
    }

    const alreadyRefreshing = await db.getAlreadyRefreshingTables(schema, tables)
    if (alreadyRefreshing.length > 0) {
        return {
            success: false,
            error: `Tables ${alreadyRefreshing.map(t => `'${t}'`).join(', ')} are already being refreshed. Please wait until they complete.`,
        }
    }

    // Fire and forget
    db.refreshTableMetadata(schema, table)
    if (table) {
        return { success: true, message: `Metadata refresh started for table: ${table}` }
    }
    return { success: true, message: 'Metadata refresh started.' }
}
