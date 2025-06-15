import { MySQLAdapter } from './mysql-adapter.js'
import { PostgresAdapter } from './postgres-adapter.js'
import { DatabaseAdapter } from './adapter.js'

export function getDatabaseType(connectionString: string): 'postgresql' | 'mysql' {
    if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
        return 'postgresql'
    } else if (connectionString.startsWith('mysql://')) {
        return 'mysql'
    }
    throw new Error('Unsupported database type. Use postgresql:// or mysql://')
}

export function createDatabaseAdapter(connectionString: string): DatabaseAdapter {
    const dbType = getDatabaseType(connectionString)
    if (dbType === 'postgresql') {
        return new PostgresAdapter(connectionString)
    } else if (dbType === 'mysql') {
        return new MySQLAdapter(connectionString)
    }
    throw new Error(`Unsupported database type: ${dbType}`)
}
