import { listTables, getTableSchema } from '../db/table-metadata.js'

export async function handleGenerateSql(question: string, context: any) {
    // Gather all table metadata
    // For simplicity, gather all tables and their schemas
    const tables = context?.tables || []
    const schema = context?.schema || 'public'
    let tableMetadata: Record<string, any> = {}
    if (tables.length === 0 && context?.pool) {
        // If context provides a pool, use it to list tables
        const allTables = await listTables(context.pool, schema)
        if ((allTables as any).error) {
            return { error: (allTables as any).error }
        }
        for (const table of allTables as string[]) {
            const meta = await getTableSchema(context.pool, table, schema)
            if (meta.error) {
                return { error: meta.error }
            }
            tableMetadata[table] = meta
        }
    } else if (tables.length > 0 && context?.pool) {
        for (const table of tables) {
            const meta = await getTableSchema(context.pool, table, schema)
            if (meta.error) {
                return { error: meta.error }
            }
            tableMetadata[table] = meta
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
