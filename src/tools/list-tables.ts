import { Pool } from 'pg'
import { listTables } from '../db/table-metadata.js'

export async function handleListTables(pool: Pool, schema = 'public') {
    const tables = await listTables(pool, schema)
    if ((tables as any).error) {
        return { error: (tables as any).error }
    }
    return { tables }
}
