import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGenerateSqlPrompt(server: McpServer) {
    server.prompt(
        'generate-sql',
        {
            question: z.string(),
            tableMetadata: z.any(),
            definitions: z.any(),
        },
        ({ question, tableMetadata, definitions }) => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `You are a helpful SQL assistant. Generate valid SQL using PostgreSQL syntax. Only answer with SQL. Question: ${question}\n\nTable Metadata: ${JSON.stringify(
                            tableMetadata,
                            null,
                            2,
                        )}\n\nDefinitions: ${JSON.stringify(definitions, null, 2)}`,
                    },
                },
            ],
        }),
    )
}
