# Contributing to AgentOS Integrations

## Mental Model

```
┌─────────────────────────────────────────────────────────────────────┐
│  INTERFACES: MCP Server • HTTP API • CarPlay • Widgets • ...       │
│  (All call into the same AgentOS Core)                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  APPS: Tasks • Books • Messages • Calendar • Finance • Databases   │
│  Location: apps/{app}/                                              │
│    - readme.md: schema, actions, params, returns                    │
│    - schema.sql: database tables (optional, for data apps)          │
│    - icon.svg: app icon                                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONNECTORS: todoist • linear • goodreads • hardcover • postgres   │
│  Location: connectors/{connector}/                                  │
│    - readme.md: auth config                                         │
│    - {app}.yaml: action→executor mappings with transforms          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTORS: rest: • graphql: • sql: • csv: • command: • app:       │
│  Location: AgentOS Core (Rust)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

| Layer | What | Location |
|-------|------|----------|
| **App** | Capability with unified schema | `apps/{app}/` |
| **Connector** | Service implementation + transforms | `connectors/{connector}/` |
| **Executor** | Protocol handler (Rust) | AgentOS Core |

---

## Two Types of Apps

### 1. Pass-through Apps (e.g., Tasks, Calendar)
Data lives in external services. AgentOS queries them directly.

```
User → AgentOS → Linear API → Response
```

### 2. Data Apps (e.g., Books, Movies, Music)
Data is imported into a local SQLite database for unified access.

```
User → AgentOS → Local SQLite → Response
                     ↑
         Import from Goodreads CSV
         Sync with Hardcover API
```

**Data apps have:**
- `schema.sql` — defines database tables
- Per-app database at `~/.agentos/data/{app}.db`
- Auto-generated CRUD actions (list, get, create, update, delete)
- Custom import/sync actions via connectors

---

## App Structure

### Pass-through App
```
apps/tasks/
  readme.md     # Schema + actions
  icon.svg
```

### Data App
```
apps/books/
  readme.md     # Schema + actions
  schema.sql    # Database tables ← triggers per-app DB creation
  icon.svg
```

When `schema.sql` exists, AgentOS automatically:
1. Creates `~/.agentos/data/{app}.db`
2. Runs the schema SQL
3. Exposes CRUD actions (list, get, create, update, delete)

---

## Adding a Data App

### 1. Create the App

**`apps/books/schema.sql`**
```sql
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  authors JSON,
  isbn TEXT,
  status TEXT NOT NULL,  -- want_to_read, reading, read, dnf
  rating INTEGER,
  review TEXT,
  date_added TEXT,
  date_finished TEXT,
  source_connector TEXT NOT NULL,
  source_id TEXT NOT NULL,
  UNIQUE(source_connector, source_id)
);
```

**`apps/books/readme.md`**
```markdown
# Books

Track your reading library across services.

## Schema
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Book title |
| authors | array | List of author names |
| status | enum | want_to_read, reading, read, dnf |
| rating | integer | 1-5 stars |
| ... | ... | ... |

## Actions
- **list** — List books with filters
- **get** — Get a single book
- **create** — Add a book
- **update** — Update a book
- **delete** — Remove a book
- **import** — Import from a connector (Goodreads CSV, etc.)
- **sync** — Sync with a connector (Hardcover API, etc.)
```

### 2. Create Connectors

**`connectors/goodreads/books.yaml`** — Import from CSV
```yaml
actions:
  import:
    csv:
      path: "{{params.path}}"
      response:
        mapping:
          goodreads_id: "[].Book Id"
          title: "[].Title"
          authors: "[].Author | to_array"
          isbn: "[].ISBN | strip_quotes"
          isbn13: "[].ISBN13 | strip_quotes"
          rating: "[].My Rating | to_int"
          status: |
            [].Exclusive Shelf == 'read' ? 'read' :
            [].Exclusive Shelf == 'currently-reading' ? 'reading' : 'want_to_read'
          date_added: "[].Date Added"
          date_finished: "[].Date Read"
          review: "[].My Review"
          source_connector: "'goodreads'"
          source_id: "[].Book Id"
    app:
      action: upsert
      table: books
      on_conflict: [source_connector, source_id]
```

**`connectors/hardcover/books.yaml`** — Sync with API
```yaml
actions:
  sync:
    # Step 1: Get books from local DB that need syncing
    - app:
        action: list
        table: books
        where:
          hardcover_id: null
      as: local_books
    
    # Step 2: For each book, search Hardcover and link
    - foreach: "{{local_books}}"
      graphql:
        query: |
          query($title: String!) {
            search(query: $title, query_type: "books", per_page: 1) {
              results
            }
          }
        variables:
          title: "{{item.title}}"
      as: search_result
    
    # Step 3: Push to Hardcover
    - graphql:
        query: |
          mutation($book_id: Int!, $status_id: Int!) {
            insert_user_book(object: {book_id: $book_id, status_id: $status_id}) {
              id
            }
          }
        variables:
          book_id: "{{search_result.results[0].id}}"
          status_id: |
            {{item.status}} == 'read' ? 3 :
            {{item.status}} == 'reading' ? 2 : 1
```

---

## Connector Structure

```
connectors/goodreads/
  readme.md       # Auth config (if any)
  icon.svg
  books.yaml      # Implements Books app
```

**One YAML per app.** If `connectors/hardcover/books.yaml` exists, Hardcover implements Books.

---

## Executors

### `rest:` — REST APIs
```yaml
rest:
  method: GET
  url: https://api.example.com/{{params.id}}
  body: { field: "{{params.value}}" }
  response:
    mapping:
      id: ".id"
      title: ".name"
```

### `graphql:` — GraphQL APIs
```yaml
graphql:
  query: "query { items { id name } }"
  variables: { limit: "{{params.limit}}" }
  response:
    root: "data.items"
    mapping:
      id: "[].id"
      title: "[].name"
```

### `sql:` — Database queries
```yaml
sql:
  query: "SELECT * FROM table WHERE id = {{params.id}}"
```

### `csv:` — CSV file import
```yaml
csv:
  path: "{{params.path}}"
  response:
    mapping:
      title: "[].Column Name"
      value: "[].Other Column | transform"
```

### `app:` — Per-app database operations
```yaml
# List with filters
app:
  action: list
  table: books
  where:
    status: "{{params.status}}"
  limit: "{{params.limit}}"

# Upsert (insert or update)
app:
  action: upsert
  table: books
  on_conflict: [source_connector, source_id]
```

### `command:` — CLI tools (firewall-controlled)
```yaml
command:
  binary: tree
  args: ["-L", "2", "{{params.path}}"]
  timeout: 30
```

### Chained Executors
```yaml
action:
  - graphql: { query: "..." }
    as: step1
  - rest:
      url: "https://api.example.com/{{step1.data.id}}"
```

---

## Response Mapping

All executors support `response.mapping` to transform data to the app schema.

### Syntax
```yaml
mapping:
  # Direct field mapping
  id: ".id"
  title: ".name"
  
  # Array mapping (use [] prefix)
  items: "[].id"
  
  # Transforms (pipe syntax)
  authors: "[].author | to_array"
  isbn: "[].isbn | strip_quotes"
  
  # Conditionals
  status: ".completed ? 'done' : 'open'"
  
  # Complex conditionals
  priority: |
    .priority == 'urgent' ? 1 :
    .priority == 'high' ? 2 :
    .priority == 'medium' ? 3 : 4
  
  # Static values
  connector: "'goodreads'"
```

### Built-in Transforms
| Transform | Description |
|-----------|-------------|
| `to_array` | Wrap single value in array |
| `to_int` | Convert to integer |
| `strip_quotes` | Remove `="..."` wrapper (common in CSV exports) |
| `trim` | Remove whitespace |
| `lowercase` | Convert to lowercase |
| `uppercase` | Convert to uppercase |
| `default:value` | Use value if null/empty |

---

## Security: No Shell Scripts

**`run:` blocks are not supported.** Connectors use declarative executor blocks only.

| Executor | Use Case |
|----------|----------|
| `rest:` | REST APIs |
| `graphql:` | GraphQL APIs |
| `sql:` | Database queries |
| `csv:` | File imports |
| `app:` | Local database operations |
| `command:` | CLI tools (user-approved via firewall) |

This ensures:
- Credentials never leave Rust core
- All operations go through the firewall
- No arbitrary code execution

---

## Schema Conventions

- **Flat structure** — no nested `metadata` objects
- **snake_case** — `created_at`, `parent_id`
- **Universal fields** — `id`, `source_connector`, `source_id`, `created_at`, `updated_at`
- **Connectors map to schema** — transforms happen in connector YAML

---

## Credentials

Connectors never see credential values. Auth config in `readme.md` specifies WHERE credentials go:

```yaml
auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
```

AgentOS injects the actual value at runtime.

---

## Example: Building a Movies App

### 1. Define the app schema

**`apps/movies/schema.sql`**
```sql
CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER,
  directors JSON,
  status TEXT NOT NULL,  -- watchlist, watching, watched
  rating INTEGER,
  review TEXT,
  source_connector TEXT NOT NULL,
  source_id TEXT NOT NULL,
  UNIQUE(source_connector, source_id)
);
```

### 2. Add Letterboxd connector

**`connectors/letterboxd/movies.yaml`**
```yaml
actions:
  import:
    csv:
      path: "{{params.path}}"
      response:
        mapping:
          title: "[].Name"
          year: "[].Year | to_int"
          rating: "[].Rating | to_int"
          status: "'watched'"
          source_connector: "'letterboxd'"
          source_id: "[].Letterboxd URI"
    app:
      action: upsert
      table: movies
      on_conflict: [source_connector, source_id]
```

### 3. Done!

Users can now:
```
Import my Letterboxd data from ~/Downloads/letterboxd.csv
List all movies I've watched
```

No Rust code needed. The connector defines all the Letterboxd-specific logic.
