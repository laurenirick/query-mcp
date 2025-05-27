import { Pool } from 'pg'
import { readTableMetadataCache, writeTableMetadataCache } from '../cache/metadata.js'

export async function listTables(schema = 'public'): Promise<string[] | { error: string }> {
    const tables = await readTableMetadataCache(schema)
    if (!tables) {
        return { error: 'Metadata cache not ready. Please run refresh_metadata.' }
    }
    return tables
}

export async function getTableSchema(table: string, schema = 'public'): Promise<any> {
    const metadata = await readTableMetadataCache(schema, table)
    if (!metadata) {
        return { error: 'Metadata cache not ready. Please run refresh_metadata.' }
    }
    return metadata
}

export async function refreshTableMetadata(pool: Pool, schema = 'public', table?: string): Promise<any> {
    let tables: string[] = []
    if (table) {
        tables = [table]
    } else {
        const tablesResult = await pool.query(
            'SELECT table_name FROM information_schema.tables WHERE table_schema = $1',
            [schema],
        )
        tables = tablesResult.rows.map((row: any) => row.table_name)
    }

    for (const tbl of tables) {
        // Columns
        const columnsResult = await pool.query(
            'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2',
            [tbl, schema],
        )
        const columns = columnsResult.rows

        // Sample newest rows (try to use 'id' or 'created_at' if present, else just LIMIT)
        let orderBy = ''
        const colNames = columns.map((col: any) => col.column_name)
        if (colNames.includes('created_at')) orderBy = 'ORDER BY created_at DESC'
        else if (colNames.includes('id')) orderBy = 'ORDER BY id DESC'
        const sampleQuery = `SELECT * FROM "${tbl}" ${orderBy} LIMIT 5`
        let samples: any[] = []
        try {
            const sampleRows = await pool.query(sampleQuery)
            samples = sampleRows.rows
        } catch {
            /* ignore error */
        }

        // Column stats
        const columnStats: Record<string, any> = {}
        for (const col of colNames) {
            let distinct = 0
            let nullCount = 0
            let topValues: Record<string, number> = {}
            let min = null
            let max = null
            try {
                const statsResult = await pool.query(
                    `SELECT COUNT(DISTINCT "${col}") AS distinct_count, COUNT(*) FILTER (WHERE "${col}" IS NULL) AS null_count FROM "${tbl}"`,
                )
                distinct = Number(statsResult.rows[0].distinct_count)
                nullCount = Number(statsResult.rows[0].null_count)
            } catch {
                /* ignore error */
            }
            try {
                const topResult = await pool.query(
                    `SELECT "${col}", COUNT(*) AS count FROM "${tbl}" GROUP BY "${col}" ORDER BY count DESC NULLS LAST LIMIT 3`,
                )
                topValues = {}
                for (const row of topResult.rows) {
                    topValues[String(row[col])] = Number(row.count)
                }
            } catch {
                /* ignore error */
            }
            try {
                const minmaxResult = await pool.query(`SELECT MIN("${col}") AS min, MAX("${col}") AS max FROM "${tbl}"`)
                min = minmaxResult.rows[0].min
                max = minmaxResult.rows[0].max
            } catch {
                /* ignore error */
            }
            columnStats[col] = { distinct, nullCount, topValues, min, max }
        }

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
    }
    return { success: true, tables }
}
