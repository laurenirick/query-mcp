import { DatabaseAdapter } from '../db/adapter.js'

export async function handleListTables(db: DatabaseAdapter, schema = 'public') {
    const tables = await db.listTables(schema)
    return { tables }
}
