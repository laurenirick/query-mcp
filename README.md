# Query MCP

A Model Context Protocol (MCP) server that provides read-only access to SQL databases, with enhanced schema discovery, business definitions, and natural language SQL generation. This server enables LLMs and tools to inspect database schemas, execute read-only queries, and interact with business definitions.

## Components

### Tools

- **list_tables**

    - List all tables in the connected database.
    - Output: Array of table names.

- **describe_table**

    - Describe columns, relationships, and sample data for a given table.
    - Input: `table` (string): Table name.
    - Output: Schema, relationships, samples, and column stats.

- **run_query**

    - Execute a read-only SQL SELECT query.
    - Input: `sql` (string): SQL query.
    - Output: Query result rows.

- **generate_sql**

    - Generate a SQL query from a natural language question, using schema and definitions.
    - Input: `question` (string), `context` (optional).
    - Output: SQL query.

- **get_definition**

    - Retrieve the business definition for a term.
    - Input: `term` (string).
    - Output: Definition text.

- **store_definition**

    - Store or update a business definition for a term.
    - Input: `term` (string), `value` (string).
    - Output: Success status.

- **refresh_metadata**

    - Refresh cached database metadata (schemas, samples, stats).
    - Input: `table` (optional string).
    - Output: Success message.

- **get_all_definitions**
    - List all stored business definitions.
    - Output: Array of definitions.

### Resources

The server provides schema and business definition resources:

- **Table Metadata** (`table-metadata://all`, `table-metadata://{table}`)

    - JSON schema information for each table, including columns, types, and relationships.
    - Automatically discovered from database metadata.

- **Definitions** (`definitions://all`)
    - All stored business definitions as JSON.

## Configuration

### Usage with Claude Desktop

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

### Docker

- When running Docker on macOS, use `host.docker.internal` if the server is running on the host network (e.g., localhost).
- Username/password can be added to the PostgreSQL URL: `postgresql://user:password@host:port/db-name`

```json
{
    "mcpServers": {
        "query-mcp": {
            "command": "docker",
            "args": ["run", "-i", "--rm", "mcp/query-mcp", "postgresql://host.docker.internal:5432/mydb"]
        }
    }
}
```

### NPX

```json
{
    "mcpServers": {
        "query-mcp": {
            "command": "npx",
            "args": ["-y", "query-mcp", "postgresql://localhost/mydb"]
        }
    }
}
```

Replace `/mydb` with your database name.

### Usage with VS Code

For quick installation, use one of the one-click install buttons below...

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](<https://insiders.vscode.dev/redirect/mcp/install?name=query-mcp&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22pg_url%22%2C%22description%22%3A%22PostgreSQL%20URL%20(e.g.%20postgresql%3A%2F%2Fuser%3Apass%40localhost%3A5432%2Fmydb)%22%7D%5D&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22query-mcp%22%2C%22%24%7Binput%3Apg_url%7D%22%5D%7D>)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](<https://insiders.vscode.dev/redirect/mcp/install?name=query-mcp&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22pg_url%22%2C%22description%22%3A%22PostgreSQL%20URL%20(e.g.%20postgresql%3A%2F%2Fuser%3Apass%40host.docker.internal%3A5432%2Fmydb)%22%7D%5D&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22-i%22%2C%22--rm%22%2C%22mcp%2Fquery-mcp%22%2C%22%24%7Binput%3Apg_url%7D%22%5D%7D>)

For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open User Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> Note that the `mcp` key is not needed in the `.vscode/mcp.json` file.

#### Docker

**Note**: When using Docker and connecting to a PostgreSQL server on your host machine, use `host.docker.internal` instead of `localhost` in the connection URL.

```json
{
    "mcp": {
        "inputs": [
            {
                "type": "promptString",
                "id": "pg_url",
                "description": "PostgreSQL URL (e.g. postgresql://user:pass@host.docker.internal:5432/mydb)"
            }
        ],
        "servers": {
            "query-mcp": {
                "command": "docker",
                "args": ["run", "-i", "--rm", "mcp/query-mcp", "${input:pg_url}"]
            }
        }
    }
}
```

#### NPX

```json
{
    "mcp": {
        "inputs": [
            {
                "type": "promptString",
                "id": "pg_url",
                "description": "PostgreSQL URL (e.g. postgresql://user:pass@localhost:5432/mydb)"
            }
        ],
        "servers": {
            "query-mcp": {
                "command": "npx",
                "args": ["-y", "query-mcp", "${input:pg_url}"]
            }
        }
    }
}
```

## Building

Docker:

```sh
docker build -t mcp/query-mcp -f src/postgres/Dockerfile .
```

## Local Development & Demo

### Local Dockerfile

A Dockerfile is provided for building and running the MCP server locally. You can build the image with:

```sh
docker build -t mcp/query-mcp -f src/postgres/Dockerfile .
```

_(Update the path above if your Dockerfile is located elsewhere.)_

### Seed Script

The `scripts/seed.ts` script can be used to populate your database with sample data for testing and demos.

```sh
npm run seed:script
```

These scripts are useful for quickly setting up and showcasing the capabilities of the Query MCP server.

## License

This MCP server is licensed under the ISC License. You are free to use, modify, and distribute the software, subject to the terms and conditions of the ISC License. For more details, please see the LICENSE file in the project repository.
