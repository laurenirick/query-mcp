import { Pool } from 'pg'
import { listTables } from '../db/table-metadata.js'

export async function handleListTables(pool: Pool) {
    const tables = await listTables(pool)
    return { tables }
}
