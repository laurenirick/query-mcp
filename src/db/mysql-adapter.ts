import mysql from 'mysql2/promise'
import { readTableMetadataCache, writeTableMetadataCache } from '../cache/metadata.js'
import { isRefreshing, setRefreshing, clearRefreshing, getRefreshingState } from '../cache/refreshing.js'
import { DatabaseAdapter, TableSchema } from './adapter.js'

export class MySQLAdapter implements DatabaseAdapter {
    private pool: mysql.Pool

    constructor(private connectionString: string) {
        this.pool = mysql.createPool(connectionString)
    }

    async connect(): Promise<void> {
        const conn = await this.pool.getConnection()
        conn.release()
    }

    async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
        const [rows] = await this.pool.query(sql, params)
        return { rows: rows as any[] }
    }

    async runReadOnlyQuery(sql: string): Promise<{ rows: any[]; isError: boolean; error?: string }> {
        const conn = await this.pool.getConnection()
        try {
            await conn.query('START TRANSACTION READ ONLY')
            const [rows] = await conn.query(sql)
            await conn.query('ROLLBACK')
            return { rows: rows as any[], isError: false }
        } catch (error: any) {
            return { error: error.message, rows: [], isError: true }
        } finally {
            conn.release()
        }
    }

    async close(): Promise<void> {
        await this.pool.end()
    }

    async listTables(schema = 'public'): Promise<string[]> {
        const { rows } = await this.query(
            `SELECT table_name as tablename FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`,
            [schema],
        )
        return rows.map((r: any) => r.tablename)
    }

    async getTableSchema(table: string, schema = 'public'): Promise<TableSchema | { error: string }> {
        if (await isRefreshing(schema, table)) {
            return { error: `Table '${table}' is currently being refreshed. Please try again later.` }
        }
        const metadata = await readTableMetadataCache(schema, table)
        if (!metadata) {
            return { error: 'Metadata cache not ready. Please run refresh_metadata.' }
        }
        return metadata
    }

    async refreshTableMetadata(schema = 'public', table?: string): Promise<any> {
        const { tables, error } = await this.resolveTablesToRefresh(schema, table)
        if (error) {
            return { error }
        }

        const alreadyRefreshing = await this.getAlreadyRefreshingTables(schema, tables)
        if (alreadyRefreshing.length > 0) {
            return {
                success: false,
                error: `Tables ${alreadyRefreshing.map(t => `'${t}'`).join(', ')} are already being refreshed. Please wait until they complete.`,
            }
        }

        await Promise.all(tables.map(tbl => setRefreshing(schema, tbl)))
        // eslint-disable-next-line no-undef
        await new Promise(resolve => setTimeout(resolve, 30000))

        try {
            await Promise.all(
                tables.map(async tbl => {
                    const columnsResult = await this.query(
                        'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? AND table_schema = ?',
                        [tbl, schema],
                    )
                    const columns = columnsResult.rows

                    let orderBy = ''
                    const colNames = columns.map((col: any) => col.column_name)
                    if (colNames.includes('created_at')) orderBy = 'ORDER BY `created_at` DESC'
                    else if (colNames.includes('id')) orderBy = 'ORDER BY `id` DESC'
                    const fqTable = `\`${schema}\`.\`${tbl}\``
                    const sampleQuery = `SELECT * FROM ${fqTable} ${orderBy} LIMIT 5`
                    let samples: any[] = []
                    try {
                        const sampleRows = await this.query(sampleQuery)
                        samples = sampleRows.rows
                    } catch {
                        /* ignore error */
                    }

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
                                    this.query(`SELECT COUNT(DISTINCT \`${col}\`) AS distinct_count, SUM(CASE WHEN \`${col}\` IS NULL THEN 1 ELSE 0 END) AS null_count FROM ${fqTable}`),
                                    this.query(`SELECT \`${col}\` AS val, COUNT(*) AS count FROM ${fqTable} GROUP BY \`${col}\` ORDER BY (\`${col}\` IS NULL), count DESC LIMIT 3`),
                                    this.query(`SELECT MIN(\`${col}\`) AS min, MAX(\`${col}\`) AS max FROM ${fqTable}`),
                                ])
                                distinct = Number((statsResult.rows[0] as any).distinct_count)
                                nullCount = Number((statsResult.rows[0] as any).null_count)
                                topValues = {}
                                for (const row of topResult.rows) {
                                    topValues[String((row as any).val)] = Number((row as any).count)
                                }
                                min = (minmaxResult.rows[0] as any).min
                                max = (minmaxResult.rows[0] as any).max
                            } catch {
                                /* ignore error */
                            }
                            columnStats[col] = { distinct, nullCount, topValues, min, max }
                        }),
                    )

                    let relationships: any[] = []
                    try {
                        const fk = await this.query(
                            `SELECT table_name AS source_table, column_name AS source_column, referenced_table_name AS target_table, referenced_column_name AS target_column FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND referenced_table_name IS NOT NULL`,
                            [schema, tbl],
                        )
                        relationships = fk.rows.map((row: any) => ({
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
            await Promise.all(tables.map(tbl => clearRefreshing(schema, tbl)))
        }
        return { success: true, tables }
    }

    async resolveTablesToRefresh(schema = 'public', table?: string): Promise<{ tables: string[]; error?: string }> {
        if (table) {
            return { tables: [table] }
        } else {
            const { rows } = await this.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
                [schema],
            )
            const tables = rows.map((row: any) => row.table_name)
            if (tables.length > 5) {
                return {
                    tables: [],
                    error: `Too many tables (${tables.length}) to refresh at once. Please refresh tables individually.`,
                }
            }
            return { tables }
        }
    }

    async getAlreadyRefreshingTables(schema: string, tables: string[]): Promise<string[]> {
        const refreshingState = await getRefreshingState(schema)
        return tables.filter(tbl => refreshingState[tbl])
    }
}
