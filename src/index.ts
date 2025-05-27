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
import { handleStoreDefinition as handleStoreDefinitionTool } from './tools/store-definition.js'
import { handleRefreshMetadata } from './tools/refresh-metadata.js'
import { registerGenerateSqlPrompt } from './prompts/generate-sql.js'
import { getAllDefinitions } from './definitions/store.js'

const server = new McpServer({
    name: 'example-servers/stub',
    version: '1.0.0',
})

registerGenerateSqlPrompt(server)

const args = process.argv.slice(2)
if (args.length === 0) {
    console.error('Please provide a database URL as a command-line argument')
    process.exit(1)
}

const databaseUrl = args[0]
const pool = createPool(databaseUrl)

// =========================
// Resource Registrations
// =========================

server.resource('table-metadata', 'table-metadata://all', async () => await handleListResources(pool))

server.resource(
    'table-metadata-table',
    new ResourceTemplate('table-metadata://{table}', { list: undefined }),
    async uri => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(await handleReadResource(pool, { params: { uri: uri.href } }), null, 2),
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
        content: [{ type: 'text', text: JSON.stringify(await handleListTables(pool), null, 2) }],
    }),
)

server.tool(
    'describe_table',
    'Describe the columns, relationships, and sample data for a given table. Input: table name. Output: schema, relationships, samples, and column stats.',
    { table: z.string() },
    async ({ table }: { table: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleDescribeTable(pool, table), null, 2) }],
    }),
)

server.tool(
    'run_query',
    'Run a read-only SQL SELECT query against the database. Input: SQL string. Output: query result rows.',
    { sql: z.string() },
    async ({ sql }: { sql: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleRunQuery(pool, sql), null, 2) }],
    }),
)

server.tool(
    'generate_sql',
    'Generate a SQL query for a natural language question, using available schema and definitions. Input: question string and optional context. Output: SQL query.',
    { question: z.string(), context: z.any().optional() },
    async ({ question, context }: { question: string; context?: any }) => ({
        content: [
            { type: 'text', text: JSON.stringify(await handleGenerateSql(question, { ...context, pool }), null, 2) },
        ],
    }),
)

server.tool(
    'get_definition',
    'Retrieve the business definition for a given term. Input: term string. Output: definition text.',
    { term: z.string() },
    async ({ term }: { term: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleGetDefinition(term), null, 2) }],
    }),
)

server.tool(
    'store_definition',
    'Store or update a business definition for a term. Input: term and value strings. Output: success status.',
    { term: z.string(), value: z.string() },
    async ({ term, value }: { term: string; value: string }) => ({
        content: [{ type: 'text', text: JSON.stringify(await handleStoreDefinitionTool(term, value), null, 2) }],
    }),
)

server.tool(
    'refresh_metadata',
    'Refresh the cached database metadata (schemas, samples, stats). No input. Output: success message.',
    {},
    async () => ({
        content: [{ type: 'text', text: JSON.stringify(await handleRefreshMetadata(pool), null, 2) }],
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

async function runServer() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

runServer().catch(console.error)
