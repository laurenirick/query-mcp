import { listTables, getTableSchema } from '../db/table-metadata.js'

export async function handleGenerateSql(question: string, context: any) {
    // Gather all table metadata
    // For simplicity, gather all tables and their schemas
    const tables = context?.tables || []
    let tableMetadata: Record<string, any> = {}
    if (tables.length === 0 && context?.pool) {
        // If context provides a pool, use it to list tables
        const allTables = await listTables(context.pool)
        for (const table of allTables) {
            tableMetadata[table] = await getTableSchema(context.pool, table)
        }
    } else if (tables.length > 0 && context?.pool) {
        for (const table of tables) {
            tableMetadata[table] = await getTableSchema(context.pool, table)
        }
    } else {
        tableMetadata = context?.tableMetadata || {}
    }

    // Gather all definitions (for now, just an empty object or could load all definitions)
    // In a real implementation, you might want to load all definitions from the store
    const definitions = context?.definitions || {}

    // Return the prompt invocation structure for MCP
    return {
        prompt: 'generate-sql',
        params: {
            question,
            tableMetadata,
            definitions,
        },
    }
}
