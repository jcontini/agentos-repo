# Contributing Plugins

This guide covers everything you need to build, test, and contribute AgentOS plugins.

## Quick Start

1. Fork this repo
2. Set your fork as the plugins source in AgentOS → Settings → Developer
3. Create your plugin in `plugins/{id}/plugin.md`
4. Test locally (changes hot-reload)
5. Submit a PR

## Plugin Structure

Plugins live in `plugins/{id}/plugin.md` with YAML frontmatter + markdown body.

```yaml
---
id: my-plugin
name: My Plugin
description: What it does (one line)
tags: [tasks, automation, api]
icon: material-symbols:icon-name
color: "#hexcolor"

# Authentication - OMIT this section entirely if no auth needed
auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
  help_url: https://example.com/api-keys

# Required dependencies (must be installed)
requires:
  - curl
  - jq
  - name: ripgrep
    install:
      macos: brew install ripgrep
      linux: sudo apt install -y ripgrep

# Recommended dependencies (optional but enhance functionality)
recommends:
  - name: fzf
    description: Enables fuzzy search in results
    install:
      macos: brew install fzf
  - name: bat
    description: Syntax highlighting for code output
    install:
      macos: brew install bat

# User-configurable settings
settings:
  limit:
    label: Default Limit
    type: integer
    default: "10"
    min: 1
    max: 100
  notes:
    type: instructions  # Label auto-generated in UI

actions:
  get_items:
    description: Get all items
    readonly: true
    params:
      limit:
        type: integer
        default: "10"
    run: |
      echo "Limit: $PARAM_LIMIT"
---

# My Plugin

Instructions for AI go here...
```

## Authentication Types

### No Auth Required

If your plugin doesn't need authentication, simply **omit the `auth:` section entirely**.

### API Key

For services that use API keys or tokens:

```yaml
auth:
  type: api_key
  header: Authorization      # HTTP header name
  prefix: "Bearer "          # Prefix before token (include trailing space)
  help_url: https://...      # Where users get their key
```

The token is available as `$AUTH_TOKEN` in your scripts.

### Connection String (Databases)

For database connections (Postgres, MySQL, SQLite, etc.):

```yaml
auth:
  type: connection_string
  help_url: https://...
```

Connection strings contain everything needed:
```
postgresql://user:password@host:port/database
mysql://user:password@host:port/database
```

Available as `$AUTH_TOKEN`. Users can add multiple accounts (staging, production, etc.) - multi-account is handled at the AgentOS level for all auth types.

### OAuth (Future)

OAuth support is planned for services requiring user authorization flows.

## Action Types

### REST API (`api:`)

The simplest way to call APIs. Auth headers are added automatically.

```yaml
actions:
  get_tasks:
    readonly: true
    api:
      method: GET
      url: https://api.example.com/tasks
  
  get_task:
    readonly: true
    api:
      method: GET
      url: https://api.example.com/tasks/$PARAM_ID
  
  delete_task:
    api:
      method: DELETE
      url: https://api.example.com/tasks/$PARAM_ID
```

Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

### GraphQL API (`graphql:`)

For GraphQL APIs, set `type: graphql` at the top level:

```yaml
api:
  base_url: https://api.linear.app/graphql
  type: graphql

actions:
  get_me:
    readonly: true
    graphql:
      query: "{ viewer { id name email } }"
      extract: .data.viewer
  
  get_issue:
    readonly: true
    graphql:
      query: |
        query($id: String!) {
          issue(id: $id) { id title state { name } }
        }
      variables:
        id: $PARAM_ID
      extract: .data.issue
```

### Shell Scripts (`run:`)

For custom logic when `api:` or `graphql:` aren't enough:

```yaml
actions:
  search:
    readonly: true
    run: |
      curl -s "https://api.example.com/search?q=$PARAM_QUERY" \
        -H "Authorization: Bearer $AUTH_TOKEN" | jq .
```

## AI-First Design

### Action Naming Convention

Use `get_*` for retrieval actions (not `list_*`):

| ✅ Good | ❌ Avoid | Why |
|---------|----------|-----|
| `get_tasks` | `list_tasks` | AI naturally says "get my tasks" |
| `get_issues` | `list_issues` | Consistent with HTTP GET semantics |
| `get_users` | `fetch_users` | Short, clear, predictable |

Other conventions:
- `create_*` - Create new resource
- `update_*` - Modify existing resource  
- `delete_*` - Remove resource
- `search` - Query with filters

Keep action names **under 15 characters**.

### Read-Only Actions

Mark safe actions with `readonly: true`:

```yaml
actions:
  get_items:
    readonly: true  # Safe - no side effects
  
  delete_item:
    # readonly: false (default) - requires confirmAction
```

Read-only actions can be called immediately. Non-readonly actions (create, update, delete) require `confirmAction: true` and show a preview first.

### Descriptions

Keep descriptions **under 50 characters**:

| ✅ Good | ❌ Bad |
|---------|--------|
| `Get all tasks` | `This action retrieves all tasks from the database` |

### Parameter Naming

Use short, standard names for better AI one-shot success:

| ✅ Standard | ❌ Avoid | Why |
|-------------|----------|-----|
| `id` | `issue_id`, `task_id` | Universal, works across plugins |
| `query` | `searchQuery`, `q` | Clear intent |
| `limit` | `maxResults`, `count` | Consistent pagination |
| `offset` | `skip`, `start` | Consistent pagination |

For single-resource actions, just use `id` - the context is clear from the action name:

```yaml
get_issue:
  params:
    id:           # Not "issue_id" - action name provides context
      type: string
      required: true
```

## Tags

Use `tags` for discovery and grouping:

```yaml
tags: [tasks, productivity, automation]
```

Common tags: `productivity`, `communication`, `search`, `code`, `finance`, `media`, `database`, `api`

## Dependencies

### Required (`requires:`)

Dependencies that **must** be installed:

```yaml
requires:
  - curl           # Simple: just binary name
  - name: psql     # Structured: with install commands
    install:
      macos: brew install postgresql
      linux: sudo apt install -y postgresql-client
```

### Recommended (`recommends:`)

Optional dependencies that **enhance** functionality:

```yaml
recommends:
  - name: fzf
    description: Enables interactive selection
    install:
      macos: brew install fzf
  - name: jq
    description: Better JSON formatting
    install:
      macos: brew install jq
```

Recommended dependencies are suggested but not required. Your plugin should work without them, just with reduced functionality.

## Environment Variables

Auto-injected into `run:` scripts:

| Variable | Description |
|----------|-------------|
| `PARAM_{NAME}` | Each param value (uppercased) |
| `AUTH_TOKEN` | Credential if auth configured |
| `SETTING_{NAME}` | Plugin settings (uppercased) |
| `PLUGIN_DIR` | Path to plugin folder |

Plugins should store any data in `$PLUGIN_DIR`. This keeps plugins sandboxed and allows AgentOS to manage plugin data centrally.

## Built-in Helpers

Available in all `run:` scripts:

```bash
error "message"      # Print to stderr and exit 1
warn "message"       # Print warning to stderr
require_file "path"  # Error if file doesn't exist
require_dir "path"   # Error if dir doesn't exist
```

## The `helpers:` Block

Define shared functions for multiple actions:

```yaml
helpers: |
  call_api() {
    curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$1"
  }

actions:
  get_items:
    readonly: true
    run: call_api "https://api.example.com/items" | jq .
```

## Settings Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Number with optional `min`/`max` |
| `boolean` | Toggle |
| `enum` | Dropdown with `options` array |
| `instructions` | Multiline text for AI |

The `instructions` type lets users provide custom guidance for AI when using the plugin.

## Plugins with Scripts

For complex logic, use a `scripts/` folder:

```
plugins/
  browser/
    plugin.md
    scripts/
      browser.mjs
```

Reference via `$PLUGIN_DIR`:

```yaml
actions:
  click:
    run: node "$PLUGIN_DIR/scripts/browser.mjs" click "$PARAM_SELECTOR"
```

## Icons

Two formats:

1. **Iconify**: `icon: material-symbols:web`
2. **URL**: `icon: https://cdn.simpleicons.org/todoist`

Browse Iconify icons: https://icon-sets.iconify.design/

## Status Codes

AgentOS uses HTTP-style status codes. Your plugin doesn't set these - the system handles it:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (wrong action, missing param) |
| 401 | Auth expired |
| 402 | API credits exhausted |
| 429 | Rate limited |
| 500 | Server error |

REST/GraphQL plugins automatically pass through upstream status codes.

## Best Practices

### Do

- Use `get_*` for retrieval actions
- Mark read-only actions with `readonly: true`
- Use native `api:` or `graphql:` blocks when possible
- Use `helpers:` for shared logic
- Return JSON for structured data
- Keep action names short (under 15 chars)
- Omit `auth:` if not needed

### Don't

- Suppress stderr (`2>/dev/null` hides errors)
- Use complex inline scripts (use helpers or scripts/)
- Hardcode paths (use env vars)
- Use `list_*` naming (use `get_*`)

## Example Plugins

| Plugin | Type | Good for |
|--------|------|----------|
| `linear/` | GraphQL | Declarative GraphQL API |
| `todoist/` | REST + shell | Mixed approach |
| `exa/` | Shell | API via curl scripts |
| `macos/` | Shell | System integration |
| `browser/` | Shell + scripts/ | Complex with external scripts |

## Testing Locally

1. Fork the plugins repo
2. Set your fork as plugins source in AgentOS Settings → Developer
3. Changes hot-reload automatically

## Questions?

Open an issue or discussion!
