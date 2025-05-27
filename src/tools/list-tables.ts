import { listTables } from '../db/table-metadata.js'
import { Pool } from 'pg'

export async function handleListTables(pool: Pool, schema = 'public') {
    const tables = await listTables(pool, schema)
    return { tables }
}
