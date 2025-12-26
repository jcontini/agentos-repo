---
id: databases
name: Databases
description: Query and manage SQL databases (Postgres, MySQL, SQLite)
icon: icon.svg
color: "#6366F1"

schema:
  # Query results - universal for all connectors
  query_result:
    rows:
      type: array
      required: true
      description: Array of result rows as objects
    row_count:
      type: number
      required: true
      description: Number of rows returned
    columns:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          type: { type: string }
      description: Column metadata

  # Table info - from tables/describe actions
  table:
    name:
      type: string
      required: true
      description: Table name
    schema:
      type: string
      description: Schema name (e.g., "public" for Postgres)
    columns:
      type: array
      items:
        type: object
        properties:
          name: { type: string, required: true }
          type: { type: string, required: true }
          nullable: { type: boolean }
          default: { type: string }
          primary_key: { type: boolean }
      description: Column definitions

actions:
  query:
    label: "Execute SQL query"
    description: Run any SQL query and return results as JSON
    readonly: false
    params:
      sql:
        type: string
        required: true
        description: SQL query to execute
      connection_string:
        type: string
        description: Ad-hoc connection string (postgresql://..., mysql://..., or /path/to/file.sqlite). Bypasses credential lookup.
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    returns: query_result

  tables:
    label: "List tables"
    description: List all tables in the database
    readonly: true
    params:
      connection_string:
        type: string
        description: Ad-hoc connection string (postgresql://..., mysql://..., or /path/to/file.sqlite). Bypasses credential lookup.
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    returns:
      type: array
      items: { type: string }

  describe:
    label: "Describe table"
    description: Get table structure (columns, types, constraints)
    readonly: true
    params:
      table:
        type: string
        required: true
        description: Table name to describe
      connection_string:
        type: string
        description: Ad-hoc connection string (postgresql://..., mysql://..., or /path/to/file.sqlite). Bypasses credential lookup.
      account:
        type: string
        description: Account label (required if multiple accounts configured)
    returns: table
---

# Databases

Query and manage SQL databases directly. Unified interface across **Postgres**, **MySQL**, and **SQLite**.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  App Type: Databases                                     │
│  Actions: query, tables, describe                        │
│  (User/AI facing - abstract)                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Connectors: postgres, mysql, sqlite                     │
│  (Maps app actions to executor calls)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Executor: sql:                                          │
│  (Protocol handler - connection pooling, query exec)    │
└─────────────────────────────────────────────────────────┘
```

## Connectors

| Connector | Auth Type | Status |
|-----------|-----------|--------|
| `postgres` | connection_string | ✅ Ready |
| `mysql` | connection_string | ✅ Ready |
| `sqlite` | local_path | ✅ Ready |

## Actions

### query
Execute any SQL query and get JSON results.

```
Databases.query(sql: "SELECT * FROM users LIMIT 5", account: "Staging")
```

### tables
List all tables in the database.

```
Databases.tables(account: "Staging")
```

### describe
Get table structure (columns, types, constraints).

```
Databases.describe(table: "users", account: "Staging")
```

## SSH Tunnels

For databases behind a firewall/bastion:

1. **Create tunnel** in Settings → Terminal → Add Tunnel:
   - Name: `prod-db`
   - Connection: `joe@bastion.example.com -L 5432:postgres.internal:5432`

2. **Create database credential** pointing to localhost:
   - Name: `Prod`
   - Value: `postgresql://user:pass@localhost:5432/mydb`

3. **Start tunnel before querying:**
   ```
   Terminal(action: "tunnel_start", name: "prod-db")
   Databases.query(sql: "SELECT 1", account: "Prod")
   ```

## Notes

- Results are always JSON arrays
- Use `account` param when you have multiple connections
- Empty results return `{ rows: [], row_count: 0 }`
- All queries are logged to Activity
- Write operations require explicit confirmation via firewall

## Future Connectors

Potential additions using different executors:

| Connector | Executor | Notes |
|-----------|----------|-------|
| `supabase` | `rest:` | Supabase REST API |
| `neon` | `sql:` | Standard Postgres wire protocol |
| `planetscale` | `sql:` | Standard MySQL wire protocol |
| `mongodb` | `mongodb:` | Would need new executor |
| `convex` | `convex:` | TypeScript function calls |
