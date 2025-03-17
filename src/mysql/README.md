# MySQL MCP Server

An MCP server for interacting with MySQL databases. This server provides tools and resources for querying MySQL databases and retrieving schema information.

## Features

- List available tables in the database
- Retrieve table schemas
- Execute read-only SQL queries
- Safe transaction handling with automatic rollback

## Installation

```bash
npm install @modelcontextprotocol/server-mysql
```

## Usage

The server requires a MySQL connection URL as a command-line argument. The URL should be in the following format:

```
mysql://user:password@host:port/database
```

To start the server:

```bash
mcp-server-mysql "mysql://user:password@localhost:3306/mydatabase"
```

## Available Tools

### query

Execute a read-only SQL query against the database.

Example:
```json
{
  "name": "query",
  "arguments": {
    "sql": "SELECT * FROM users LIMIT 5"
  }
}
```

## Available Resources

The server exposes database table schemas as resources. Each table in the database is available at:

```
mysql://host:port/database/table_name/schema
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run in development mode: `npm run watch`

## License

MIT
