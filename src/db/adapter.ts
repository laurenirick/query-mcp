export interface TableSchema {
    columns: any[]
    relationships: any[]
    samples: any[]
    columnStats: Record<string, any>
}

export interface DatabaseAdapter {
    connect(): Promise<void>
    query(sql: string, params?: any[]): Promise<{ rows: any[] }>
    runReadOnlyQuery(sql: string): Promise<{ rows: any[]; isError: boolean; error?: string }>
    close(): Promise<void>
    listTables(schema: string): Promise<string[]>
    getTableSchema(table: string, schema: string): Promise<TableSchema | { error: string }>
    refreshTableMetadata(schema: string, table?: string): Promise<any>
    resolveTablesToRefresh(schema: string, table?: string): Promise<{ tables: string[]; error?: string }>
    getAlreadyRefreshingTables(schema: string, tables: string[]): Promise<string[]>
}
