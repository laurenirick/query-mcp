import { Pool } from 'pg'

export async function handleRunQuery(pool: Pool, sql: string) {
    // Only allow SELECT queries for safety
    if (!/^\s*select\b/i.test(sql)) {
        return {
            error: 'Only SELECT queries are allowed.',
            rows: [],
            isError: true,
        }
    }
    try {
        const result = await pool.query(sql)
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
    }
}
