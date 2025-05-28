#!/usr/bin/env node
/* eslint-disable no-undef */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createPool } from './db/pool.js'
import { handleListResources, handleReadResource } from './resources/table-metadata.js'
import { handleListTables } from './tools/list-tables.js'
import { handleDescribeTable } from './tools/describe-table.js'
import { handleRunQuery } from './tools/run-query.js'
import { handleGenerateSql } from './tools/generate-sql.js'
import { handleGetDefinition } from './tools/get-definition.js'
import { handleStoreDefinition as handleStoreDefinitionTool, handleRemoveDefinition } from './tools/store-definition.js'
import { handleRefreshMetadata } from './tools/refresh-metadata.js'
import { getRefreshingState } from './cache/refreshing.js'
import { registerGenerateSqlPrompt } from './prompts/generate-sql.js'
import { getAllDefinitions } from './definitions/store.js'

const server = new McpServer({
    name: 'robrichardson13/query-mcp',
    version: '1.0.3',
})

registerGenerateSqlPrompt(server)

const args = process.argv.slice(2)
if (args.length === 0) {
    console.error('Please provide a database URL as a command-line argument')
    process.exit(1)
}

const databaseUrl = args[0]
const schema = args[1] || 'public'
const pool = createPool(databaseUrl)

// =========================
// Resource Registrations
// =========================

server.resource('table-metadata', 'table-metadata://all', () => handleListResources(pool, schema))

server.resource(
    'table-metadata-table',
    new ResourceTemplate('table-metadata://{table}', { list: undefined }),
    async uri => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(await handleReadResource({ params: { uri: uri.href } }, schema), null, 2),
            },
        ],
    }),
)

server.resource('definitions', 'definitions://all', async uri => ({
    contents: [
        {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(await getAllDefinitions(), null, 2),
        },
    ],
}))

// =========================
// Tool Registrations
// =========================

server.tool(
    'list_tables',
    'List all tables in the connected database. Returns an array of table names.',
    {},
    async () => ({
        content: [{ type: 'text', text: JSON.stringify(await handleListTables(pool, schema), null, 2) }],
    }),
)

server.tool(
    'describe_table',
    'Describe the columns, relationships, and sample data for a given table. Input: table name. Output: schema, relationships, samples, and column stats.',
    { table: z.string().describe('The name of the table to describe.') },
    async ({ table }: { table: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleDescribeTable(table, schema), null, 2) }],
    }),
)

server.tool(
    'run_query',
    'Run a read-only SQL SELECT query against the database. Input: SQL string. Output: query result rows.',
    { sql: z.string().describe('A SQL SELECT query to run against the database.') },
    async ({ sql }: { sql: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleRunQuery(pool, sql), null, 2) }],
    }),
)

server.tool(
    'generate_sql',
    'Generate a SQL query for a natural language question, using available schema and definitions. Input: question string and optional context. Output: SQL query.',
    {
        question: z.string().describe('A natural language question to generate SQL for.'),
        context: z.any().optional().describe('Optional context for SQL generation, such as table or schema info.'),
    },
    async ({ question, context }: { question: string; context?: any }) => ({
        content: [
            {
                type: 'text',
                text: JSON.stringify(await handleGenerateSql(question, { ...context, schema }), null, 2),
            },
        ],
    }),
)

server.tool(
    'get_definition',
    'Retrieve the business definition for a given term. Input: term string. Output: definition text.',
    { term: z.string().describe('The business term to retrieve the definition for.') },
    async ({ term }: { term: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleGetDefinition(term), null, 2) }],
    }),
)

server.tool(
    'store_definition',
    'Store or update a business definition for a term. If the term exists, it will be updated. Input: term and value strings. Output: success status.',
    {
        term: z.string().describe('The business term to define.'),
        value: z.string().describe('The definition text for the term.'),
    },
    async ({ term, value }: { term: string; value: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleStoreDefinitionTool(term, value), null, 2) }],
    }),
)

server.tool(
    'remove_definition',
    'Remove a business definition for a term. Input: term string. Output: success status.',
    {
        term: z.string().describe('The business term to remove.'),
    },
    async ({ term }: { term: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleRemoveDefinition(term), null, 2) }],
    }),
)

server.tool(
    'refresh_metadata',
    'Refresh the cached database metadata (schemas, samples, stats). Optionally specify a table to refresh only that table. Output: success message.',
    { table: z.string().optional().describe('The name of a table to refresh, or leave blank to refresh all tables.') },
    async ({ table }: { table?: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleRefreshMetadata(pool, schema, table), null, 2) }],
    }),
)

server.tool(
    'get_all_definitions',
    'List all stored business definitions. No input. Output: array of definitions.',
    {},
    async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getAllDefinitions()) }],
    }),
)

server.tool(
    'refresh_status',
    'Check the refresh status for all tables or a specific table. Input: optional table name. Output: refresh state.',
    { table: z.string().optional().describe('The name of a table to check, or leave blank for all tables.') },
    async ({ table }: { table?: string }) => {
        const state = await getRefreshingState(schema)
        if (table) {
            return { content: [{ type: 'text', text: JSON.stringify({ [table]: !!state[table] }, null, 2) }] }
        }
        return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] }
    },
)

async function runServer() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

runServer().catch(console.error)
