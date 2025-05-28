import { Pool } from 'pg'

export async function handleRunQuery(pool: Pool, sql: string) {
    const client = await pool.connect()
    try {
        await client.query('BEGIN TRANSACTION READ ONLY')
        const result = await client.query(sql)
        await client.query('ROLLBACK') // or COMMIT, but ROLLBACK is safer for read-only
        return {
            rows: result.rows,
            isError: false,
        }
    } catch (error: any) {
        return {
            error: error.message,
            rows: [],
            isError: true,
        }
    } finally {
        client.release()
    }
}
