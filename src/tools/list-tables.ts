import { listTables } from '../db/table-metadata.js'

export async function handleListTables(schema = 'public') {
    const tables = await listTables(schema)
    if ((tables as any).error) {
        return { error: (tables as any).error }
    }
    return { tables }
}
