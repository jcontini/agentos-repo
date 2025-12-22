# Contributing to AgentOS Integrations

This guide covers how to build apps and connectors for AgentOS.

---

## Security Architecture

AgentOS follows a **secure-by-design** architecture where connectors describe WHAT to do and AgentOS core executes HOW with secure credential handling.

### Core Principles

1. **Credentials are internal** — Stored centrally, injected by AgentOS core, never exposed to connectors
2. **Declarative execution** — Connectors use `rest:`, `graphql:`, `sql:`, `applescript:` blocks instead of shell scripts
3. **Firewall intercepts all** — Every operation goes through firewall rules before execution
4. **Activity log captures all** — Complete audit trail of every action

### ⛔ No Shell Scripts

**`run:` blocks are not supported.** All connector actions must use typed executor blocks:

| Executor | Use Case |
|----------|----------|
| `rest:` | REST API calls |
| `graphql:` | GraphQL API calls |
| `sql:` | SQLite database queries |
| `applescript:` | macOS automation |

This ensures:
- Credentials never leave Rust core
- All requests go through the firewall
- Full audit logging of every operation
- No arbitrary code execution

### Security Guarantees

| Attack Vector | Protection |
|---------------|------------|
| Malicious connector exfiltrates credentials | ❌ Impossible — connector never sees values |
| Unauthorized network requests | ❌ Blocked by firewall rules |
| Credential logging via echo/print | ❌ No shell access, no env vars |
| Cross-connector credential access | ❌ Each connector only uses its own credentials |

### Execution Flow

```
AI Request → Firewall → Executor (injects creds) → External API
                ↓
         Activity Log
```

---

## Schema Design Principles

When designing app schemas, follow these principles:

### 1. Flat Structure

All fields live at the root level. **No `metadata` object.**

```yaml
# ✅ Good - flat
id: "abc123"
title: "Fix bug"
children: ["def456", "ghi789"]
blocked_by: ["xyz000"]

# ❌ Bad - nested metadata
id: "abc123"
title: "Fix bug"
metadata:
  children: [...]
  blocked_by: [...]
```

**Why:** AI doesn't need to decide what's "primary" vs "metadata". Everything is first-class.

### 2. Naming Conventions

| Convention | Example | Used For |
|------------|---------|----------|
| `snake_case` | `created_at`, `parent_id` | All field names |
| Singular nouns | `assignee`, `project` | Single object fields |
| Plural nouns | `labels`, `children` | Array fields |

**Why:** Universal across languages, database-friendly, easily converted to display format.

### 3. Universal Concepts

Some fields are universal across ALL entity types:

| Field | Meaning | Examples |
|-------|---------|----------|
| `id` | Unique identifier | Every entity |
| `parent_id` | Parent entity ID | Subtasks, threaded messages, folders |
| `children` | Child entity IDs | Subtasks, replies, folder contents |
| `created_at` | Creation timestamp | Every entity |
| `updated_at` | Last modified | Every entity |
| `connector` | Source connector | Every entity |
| `account` | Source account | Multi-account connectors |
| `url` | Deep link to source | Every entity |

### 4. Connectors Return What They Have

If a connector doesn't support a field, just don't return it. The schema defines the **maximum** set of fields; connectors are the **subset** they support.

```yaml
# Todoist returns:
{ id, title, status, priority, due, project, labels, url, connector }

# Linear returns (more fields):
{ id, title, status, priority, team, cycle, state, blocked_by, blocks, children, ... }
```

### 5. MECE (Mutually Exclusive, Collectively Exhaustive)

Each piece of data has exactly one home in the schema. No duplication, no ambiguity.

---

## Auth Actions

Connectors can define standardized auth-related actions in their `readme.md`. These are connector-level operations, not app-type operations.

### Standard Auth Actions

| Action | Description | Returns |
|--------|-------------|---------|
| `whoami` | Get current authenticated user | `{ id, name, email }` |

### Example

```yaml
# connectors/linear/readme.md
auth:
  type: api_key
  header: Authorization
  prefix: ""
  
  actions:
    whoami:
      description: Get current authenticated user
      graphql:
        query: "{ viewer { id name email } }"
      returns:
        id: { type: string }
        name: { type: string }
        email: { type: string }
```

**Why `whoami`?** Unix-informed naming. Clear, action-oriented, widely understood.

---

## Architecture Overview

AgentOS uses a three-tier architecture:

```
apps/           # Entity types with unified schemas
connectors/     # Provider integrations that map to app schemas  
tools/          # Utilities that don't manage entities
```

### Apps

Apps define **entity types** with unified schemas. They describe WHAT data looks like, not how to get it.

Examples: `tasks`, `messages`, `calendar`, `contacts`, `files`, `finance`

### Connectors

Connectors are **provider integrations** that map external APIs to app schemas. They describe HOW to connect to a service.

Examples: `todoist`, `linear`, `google`, `apple`, `whatsapp`

One connector (provider) can support multiple apps. For example, `google` provides:
- `tasks` (Google Tasks)
- `calendar` (Google Calendar)
- `contacts` (Google Contacts)
- `messages` (Gmail)

### Tools

Tools are **utilities** that don't manage entities. They perform actions but don't have unified schemas.

Examples: `browser`, `sql`, `terminal`

---

## Directory Structure

```
apps/
  tasks/
    readme.md           # Schema + documentation
  messages/
    readme.md
  calendar/
    readme.md
  contacts/
    readme.md
  files/
    readme.md
  finance/
    readme.md
  ...

connectors/
  todoist/
    readme.md           # Auth config + provider info
    tasks.yaml          # Mapping: Todoist API → tasks schema
  linear/
    readme.md
    tasks.yaml
  google/
    readme.md
    tasks.yaml          # Google Tasks
    calendar.yaml       # Google Calendar
    contacts.yaml       # Google Contacts
    messages.yaml       # Gmail
  apple/
    readme.md
    calendar.yaml
    contacts.yaml
    messages.yaml       # iMessage
  whatsapp/
    readme.md
    messages.yaml
  ...

tools/
  browser/
    readme.md
  sql/
    readme.md
  terminal/
    readme.md
```

**Key principle:** Filesystem is the source of truth. If `connectors/google/tasks.yaml` exists, Google provides tasks. No duplication needed.

---

## App Definition

Apps are defined in `apps/{app-type}/readme.md` with YAML frontmatter:

```yaml
---
id: tasks
name: Tasks
description: Unified task management across all your tools
icon: material-symbols:check-circle
color: "#10B981"

schema:
  task:
    id: { type: string, required: true }
    title: { type: string, required: true }
    description: { type: string }
    status: { type: enum, values: [open, in_progress, done, cancelled] }
    priority: { type: number, min: 1, max: 4 }
    due: { type: datetime }
    project:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
    connector: { type: string, required: true }
    account: { type: string }
    created_at: { type: datetime }
    updated_at: { type: datetime }

actions:
  list:
    description: List tasks
    params:
      connector: { type: string, description: "Filter by connector" }
      account: { type: string, description: "Filter by account" }
      filter: { type: string, description: "Filter expression" }
      limit: { type: number, default: 50 }
    returns: task[]

  get:
    description: Get a single task
    params:
      id: { type: string, required: true }
      connector: { type: string, required: true }
    returns: task

  create:
    description: Create a new task
    params:
      title: { type: string, required: true }
      description: { type: string }
      due: { type: string }
      priority: { type: number }
      connector: { type: string, required: true }
      account: { type: string }
    returns: task

  complete:
    description: Mark task as done
    params:
      id: { type: string, required: true }
      connector: { type: string, required: true }
    returns: task

  update:
    description: Update a task
    params:
      id: { type: string, required: true }
      connector: { type: string, required: true }
      # ... fields to update
    returns: task

  delete:
    description: Delete a task
    params:
      id: { type: string, required: true }
      connector: { type: string, required: true }
    returns: void

# Optional: AI instructions for this app type
instructions: |
  When working with tasks, always confirm before deleting.
  Use connector: "todoist" for personal tasks, "linear" for work.
---

# Tasks

Unified task management across all your tools.

## Schema

The `task` entity represents a to-do item from any source...

## Actions

### list

List tasks from one or all connectors...
```

---

## Connector Definition

Connectors have two files:

### 1. Provider Config: `connectors/{provider}/readme.md`

```yaml
---
id: todoist
name: Todoist
description: Personal task management
icon: simple-icons:todoist
color: "#E44332"

# Platform requirements (optional)
# platform: macos  # Use for Apple-only connectors

auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
  
# For OAuth providers:
# auth:
#   type: oauth2
#   authorization_url: https://accounts.google.com/o/oauth2/v2/auth
#   token_url: https://oauth2.googleapis.com/token
#   scopes:
#     tasks: ["https://www.googleapis.com/auth/tasks"]
#     calendar: ["https://www.googleapis.com/auth/calendar"]

# Optional: AI instructions for this connector
instructions: |
  Todoist uses priority 1-4 where 4 is urgent (inverted from UI display).
  Projects cannot be changed after task creation.
---

# Todoist

Personal task management integration.

## Setup

1. Get API token from https://todoist.com/app/settings/integrations/developer
2. Add credential in AgentOS Settings → Connectors → Todoist
```

### 2. App Mapping: `connectors/{provider}/{app-type}.yaml`

```yaml
# connectors/todoist/tasks.yaml
for: tasks

actions:
  list:
    rest:
      method: GET
      url: https://api.todoist.com/rest/v2/tasks
      params:
        project_id: "{{params.project}}"
      response:
        mapping:
          id: "[].id"
          title: "[].content"
          description: "[].description"
          status: "[].is_completed ? 'done' : 'open'"
          priority: "5 - [].priority"
          due: "[].due.date"
          project:
            id: "[].project_id"
          connector: "'todoist'"

  get:
    rest:
      method: GET
      url: "https://api.todoist.com/rest/v2/tasks/{{params.id}}"
      response:
        mapping:
          id: ".id"
          title: ".content"
          # ...

  create:
    rest:
      method: POST
      url: https://api.todoist.com/rest/v2/tasks
      body:
        content: "{{params.title}}"
        description: "{{params.description}}"
        due_string: "{{params.due}}"
        priority: "5 - {{params.priority}}"
      response:
        mapping:
          id: ".id"
          title: ".content"
          # ...

  complete:
    rest:
      method: POST
      url: "https://api.todoist.com/rest/v2/tasks/{{params.id}}/close"
      response:
        # Return the completed task
        static:
          id: "{{params.id}}"
          status: "done"
```

---

## Executor Blocks

Connectors use **declarative executor blocks only**. This is enforced by the security architecture — see [Security Architecture](#security-architecture) above.

Each executor:
- Runs in AgentOS Rust core (not in a shell)
- Has credentials injected automatically
- Goes through the firewall before execution
- Is fully logged in the activity log

### `rest:` - REST APIs

```yaml
rest:
  method: GET | POST | PUT | PATCH | DELETE
  url: https://api.example.com/endpoint/{{params.id}}
  headers:
    X-Custom-Header: value
  params:           # Query parameters
    limit: "{{params.limit}}"
  body:             # Request body (for POST/PUT/PATCH)
    field: "{{params.value}}"
  response:
    mapping:        # JSONPath-like mapping to schema
      id: ".id"
      title: ".name"
```

### `graphql:` - GraphQL APIs

```yaml
graphql:
  url: https://api.linear.app/graphql
  query: |
    query GetIssues($limit: Int) {
      issues(first: $limit) {
        nodes {
          id
          title
          state { name }
        }
      }
    }
  variables:
    limit: "{{params.limit}}"
  response:
    root: "data.issues.nodes"
    mapping:
      id: "[].id"
      title: "[].title"
      status: "[].state.name"
```

### `sql:` - SQLite Databases

```yaml
sql:
  database: "~/Library/Messages/chat.db"
  query: |
    SELECT 
      ROWID as id,
      text as content,
      datetime(date/1000000000 + 978307200, 'unixepoch') as timestamp
    FROM message
    WHERE text IS NOT NULL
    ORDER BY date DESC
    LIMIT {{params.limit}}
  response:
    mapping:
      id: "[].id"
      content: "[].content"
      timestamp: "[].timestamp"
      connector: "'apple'"
```

### `applescript:` - macOS Automation

```yaml
applescript:
  script: |
    tell application "Calendar"
      set allEvents to {}
      repeat with cal in calendars
        set calEvents to (every event of cal whose start date > (current date))
        repeat with evt in calEvents
          set end of allEvents to {id: uid of evt, title: summary of evt}
        end repeat
      end repeat
      return allEvents
    end tell
  response:
    mapping:
      id: "[].id"
      title: "[].title"
```

### Need a New Executor?

If your connector needs functionality not covered by existing executors, open an issue to discuss adding a new executor type. Common requests:

- `eventkit:` - Native macOS EventKit for Calendar/Reminders
- `http:` - Unauthenticated HTTP requests (for public APIs)
- `jxa:` - JavaScript for Automation (alternative to AppleScript)

New executors are added to AgentOS core to maintain security guarantees.

---

## MCP Tool Exposure

Each app type is exposed as its own MCP tool:

```
tasks.list(connector: "linear", account: "Adavia")
tasks.create(title: "Fix bug", connector: "todoist")
messages.search(query: "dinner")
calendar.events(date: "today")
contacts.search(query: "John")
finance.transactions(limit: 10)
```

Tools (`browser`, `sql`, `terminal`) are exposed as separate MCP tools since they're not entity-type apps.

---

## Credentials

Credentials are managed centrally by AgentOS. **Connectors never see credential values.**

### How It Works

1. Credentials stored in `~/.agentos/credentials.json` (future: macOS Keychain)
2. Format: `{connector}:{account}` (e.g., `linear:Adavia`, `todoist:Personal`)
3. When an executor runs, AgentOS core injects the credential directly into the request
4. The connector YAML only specifies WHERE the credential goes (header, query param, etc.)

### Auth Configuration

In your connector's `readme.md`:

```yaml
auth:
  type: api_key
  header: Authorization    # Which header to use
  prefix: "Bearer "        # Prefix before the token
```

The actual token value is never in any connector file — it's injected at runtime.

### Specifying Account in Requests

```
tasks.list(connector: "linear", account: "Adavia")
```

- If only one account exists for a connector, it's used automatically
- If multiple exist and none specified, an error lists available accounts
- Users add credentials in AgentOS Settings → Connectors

---

## Return Data Format

All data returned from connectors includes:

```json
{
  "id": "123",
  "title": "My Task",
  "connector": "todoist",
  "account": "Personal",
  // ... other schema fields
}
```

The `connector` and `account` fields are always present to identify the data source.

---

## Platform-Specific Connectors

Some connectors only work on specific platforms:

```yaml
# connectors/apple/readme.md
---
id: apple
name: Apple
platform: macos

auth:
  type: system_permission
  permissions:
    - calendar
    - contacts
    - full_disk_access  # For iMessage
---
```

Platform values: `macos`, `windows`, `linux`, `all` (default)

---

## App Type Reference

| App Type | Entity | Common Actions |
|----------|--------|----------------|
| `tasks` | task, project | list, get, create, update, complete, delete |
| `messages` | message, conversation | list, get, search |
| `calendar` | event, calendar | list, get, create, update, delete |
| `contacts` | contact, group | list, get, create, update, delete, search |
| `files` | file, directory | list, read, write, delete |
| `finance` | transaction, account | list, get, categorize |
| `media` | track, playlist | list, get, play, pause |
| `search` | result | search |
| `bookmarks` | bookmark | list, get, create, delete |
| `reading` | article | list, get, archive |
| `books` | book | list, get, update |
| `health` | sleep, activity | list, get |
| `location` | location, checkin | list, get |
| `photos` | photo, album | list, get |
| `journal` | entry | list, get, create |

---

## Contributing a New Connector

1. **Create provider folder:** `connectors/{provider}/`

2. **Add readme.md** with auth config:
   ```yaml
   ---
   id: my-provider
   name: My Provider
   auth:
     type: api_key
     header: Authorization
     prefix: "Bearer "
   ---
   ```

3. **Add app mapping(s):** `{app-type}.yaml` for each app type supported

4. **Test locally** by adding to your AgentOS sources

5. **Submit PR** to the connectors repo

---

## Questions?

Open an issue or discussion on the AgentOS repo.
