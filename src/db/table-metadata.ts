import { Pool } from 'pg'
import { readTableMetadataCache, writeTableMetadataCache } from '../cache/metadata.js'
import { isRefreshing, setRefreshing, clearRefreshing, getRefreshingState } from '../cache/refreshing.js'

export async function listTables(pool: Pool, schema = 'public'): Promise<string[]> {
    const tablesResult = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
        [schema],
    )
    return tablesResult.rows.map((row: any) => row.table_name)
}

export async function getTableSchema(table: string, schema = 'public'): Promise<any> {
    // Block data access if refresh is in progress
    if (await isRefreshing(schema, table)) {
        return { error: `Table '${table}' is currently being refreshed. Please try again later.` }
    }
    const metadata = await readTableMetadataCache(schema, table)
    if (!metadata) {
        return { error: 'Metadata cache not ready. Please run refresh_metadata.' }
    }
    return metadata
}

export async function refreshTableMetadata(pool: Pool, schema = 'public', table?: string): Promise<any> {
    const { tables, error } = await resolveTablesToRefresh(pool, schema, table)
    if (error) {
        return { error }
    }

    const alreadyRefreshing = await getAlreadyRefreshingTables(schema, tables)
    if (alreadyRefreshing.length > 0) {
        return {
            success: false,
            error: `Tables ${alreadyRefreshing.map(t => `'${t}'`).join(', ')} are already being refreshed. Please wait until they complete.`,
        }
    }

    // Mark as refreshing
    await Promise.all(tables.map(tbl => setRefreshing(schema, tbl)))

    // Add artificial delay for testing
    // eslint-disable-next-line no-undef
    await new Promise(resolve => setTimeout(resolve, 30000))

    try {
        // Parallelize per-table work
        await Promise.all(
            tables.map(async tbl => {
                // Columns
                const columnsResult = await pool.query(
                    'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2',
                    [tbl, schema],
                )
                const columns = columnsResult.rows

                // Sample newest rows (try to use 'id' or 'created_at' if present, else just LIMIT)
                let orderBy = ''
                const colNames = columns.map((col: any) => col.column_name)
                if (colNames.includes('created_at')) orderBy = 'ORDER BY "created_at" DESC'
                else if (colNames.includes('id')) orderBy = 'ORDER BY "id" DESC'
                const fqTable = `"${schema}"."${tbl}"`
                const sampleQuery = `SELECT * FROM ${fqTable} ${orderBy} LIMIT 5`
                let samples: any[] = []
                try {
                    const sampleRows = await pool.query(sampleQuery)
                    samples = sampleRows.rows
                } catch {
                    /* ignore error */
                }

                // Column stats
                const columnStats: Record<string, any> = {}
                await Promise.all(
                    colNames.map(async col => {
                        let distinct = 0
                        let nullCount = 0
                        let topValues: Record<string, number> = {}
                        let min = null
                        let max = null
                        try {
                            const [statsResult, topResult, minmaxResult] = await Promise.all([
                                pool.query(
                                    `SELECT COUNT(DISTINCT "${col}") AS distinct_count, SUM(CASE WHEN "${col}" IS NULL THEN 1 ELSE 0 END) AS null_count FROM ${fqTable}`,
                                ),
                                pool.query(
                                    `SELECT "${col}", COUNT(*) AS count FROM ${fqTable} GROUP BY "${col}" ORDER BY ("${col}" IS NULL), count DESC LIMIT 3`,
                                ),
                                pool.query(`SELECT MIN("${col}") AS min, MAX("${col}") AS max FROM ${fqTable}`),
                            ])
                            distinct = Number(statsResult.rows[0].distinct_count)
                            nullCount = Number(statsResult.rows[0].null_count)
                            topValues = {}
                            for (const row of topResult.rows) {
                                topValues[String(row[col])] = Number(row.count)
                            }
                            min = minmaxResult.rows[0].min
                            max = minmaxResult.rows[0].max
                        } catch {
                            /* ignore error */
                        }
                        columnStats[col] = { distinct, nullCount, topValues, min, max }
                    }),
                )

                // Relationships (foreign keys)
                let relationships: any[] = []
                try {
                    const fkResult = await pool.query(
                        `SELECT
                      tc.table_name AS source_table,
                      kcu.column_name AS source_column,
                      ccu.table_name AS target_table,
                      ccu.column_name AS target_column
                    FROM
                      information_schema.table_constraints AS tc
                      JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                      JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                        AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2;`,
                        [schema, tbl],
                    )
                    relationships = fkResult.rows.map((row: any) => ({
                        source_column: row.source_column,
                        target_table: row.target_table,
                        target_column: row.target_column,
                    }))
                } catch {
                    /* ignore error */
                }

                const metadata = { columns, relationships, samples, columnStats }
                await writeTableMetadataCache(tbl, metadata, schema)
            }),
        )
    } finally {
        // Always clear refreshing state
        await Promise.all(tables.map(tbl => clearRefreshing(schema, tbl)))
    }
    return { success: true, tables }
}

export async function resolveTablesToRefresh(
    pool: Pool,
    schema = 'public',
    table?: string,
): Promise<{ tables: string[]; error?: string }> {
    if (table) {
        return { tables: [table] }
    } else {
        const tablesResult = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
            [schema],
        )
        const tables = tablesResult.rows.map((row: any) => row.table_name)
        if (tables.length > 5) {
            return {
                tables: [],
                error: `Too many tables (${tables.length}) to refresh at once. Please refresh tables individually.`,
            }
        }
        return { tables }
    }
}

export async function getAlreadyRefreshingTables(schema: string, tables: string[]): Promise<string[]> {
    const refreshingState = await getRefreshingState(schema)
    return tables.filter(tbl => refreshingState[tbl])
}
