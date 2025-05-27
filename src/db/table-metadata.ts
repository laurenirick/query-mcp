import { Pool } from 'pg'
import { readTableMetadataCache, writeTableMetadataCache } from '../cache/metadata.js'

export async function listTables(pool: Pool, schema = 'public', refresh = false): Promise<string[]> {
    let metadata = !refresh ? await readTableMetadataCache(schema) : null
    if (!metadata) {
        metadata = await refreshTableMetadata(pool, schema)
    }
    return metadata.tables || []
}

export async function getTableSchema(pool: Pool, table: string, schema = 'public', refresh = false): Promise<any> {
    let metadata = !refresh ? await readTableMetadataCache(schema) : null
    if (!metadata) {
        metadata = await refreshTableMetadata(pool, schema)
    }
    // Return schema and relationships for the table
    return {
        columns: metadata.schemas?.[table] || [],
        relationships: metadata.relationships?.[table] || [],
        samples: metadata.samples?.[table] || [],
        columnStats: metadata.columnStats?.[table] || {},
    }
}

export async function refreshTableMetadata(pool: Pool, schema = 'public'): Promise<any> {
    // Query all tables
    const tablesResult = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', [
        schema,
    ])
    const tables = tablesResult.rows.map(row => row.table_name)

    // Query schemas for each table
    const schemas: Record<string, any> = {}
    const samples: Record<string, any[]> = {}
    const columnStats: Record<string, any> = {}

    for (const table of tables) {
        // Columns
        const columnsResult = await pool.query(
            'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2',
            [table, schema],
        )
        schemas[table] = columnsResult.rows

        // Sample newest rows (try to use 'id' or 'created_at' if present, else just LIMIT)
        let orderBy = ''
        const colNames = columnsResult.rows.map((col: any) => col.column_name)
        if (colNames.includes('created_at')) orderBy = 'ORDER BY created_at DESC'
        else if (colNames.includes('id')) orderBy = 'ORDER BY id DESC'
        const sampleQuery = `SELECT * FROM "${table}" ${orderBy} LIMIT 5`
        try {
            const sampleRows = await pool.query(sampleQuery)
            samples[table] = sampleRows.rows
        } catch {
            samples[table] = []
        }

        // Column stats
        columnStats[table] = {}
        for (const col of colNames) {
            // Distinct count
            let distinct = 0
            let nullCount = 0
            let topValues: Record<string, number> = {}
            let min = null
            let max = null
            try {
                const statsResult = await pool.query(
                    `SELECT COUNT(DISTINCT "${col}") AS distinct_count, COUNT(*) FILTER (WHERE "${col}" IS NULL) AS null_count FROM "${table}"`,
                )
                distinct = Number(statsResult.rows[0].distinct_count)
                nullCount = Number(statsResult.rows[0].null_count)
            } catch {
                /* ignore */
            }
            // Top values
            try {
                const topResult = await pool.query(
                    `SELECT "${col}", COUNT(*) AS count FROM "${table}" GROUP BY "${col}" ORDER BY count DESC NULLS LAST LIMIT 3`,
                )
                topValues = {}
                for (const row of topResult.rows) {
                    topValues[String(row[col])] = Number(row.count)
                }
            } catch {
                /* ignore */
            }
            // Min/max for numerics
            try {
                const minmaxResult = await pool.query(
                    `SELECT MIN("${col}") AS min, MAX("${col}") AS max FROM "${table}"`,
                )
                min = minmaxResult.rows[0].min
                max = minmaxResult.rows[0].max
            } catch {
                /* ignore */
            }
            columnStats[table][col] = { distinct, nullCount, topValues, min, max }
        }
    }

    // Query relationships (foreign keys)
    const fkResult = await pool.query(
        `
    SELECT
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
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1;`,
        [schema],
    )

    // Organize relationships by source table
    const relationships: Record<string, any[]> = {}
    for (const row of fkResult.rows) {
        if (!relationships[row.source_table]) relationships[row.source_table] = []
        relationships[row.source_table].push({
            source_column: row.source_column,
            target_table: row.target_table,
            target_column: row.target_column,
        })
    }

    const metadata = { tables, schemas, relationships, samples, columnStats }
    await writeTableMetadataCache(metadata, schema)
    return metadata
}
