import { DatabaseAdapter } from '../db/adapter.js'

export async function handleRunQuery(db: DatabaseAdapter, sql: string) {
    return await db.runReadOnlyQuery(sql)
}
