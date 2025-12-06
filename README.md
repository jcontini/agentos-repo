# Passport Skills

Open-source skill definitions for [Passport](https://github.com/jcontini/passport).

Skills teach AI agents how to use your connected apps — they're markdown files with API documentation and configuration.

## What's a Skill?

A skill is a markdown file with:
- **YAML frontmatter** — metadata (auth config, abilities, API settings)
- **Instructions** — API docs the AI reads to make requests

Example:
```yaml
---
id: todoist
name: Todoist
description: Personal task management
category: productivity

abilities:
  - id: read_tasks
    label: "Read your tasks"
    endpoints:
      - "GET /rest/v2/tasks"
      - "GET /rest/v2/tasks/*"
  - id: write_tasks
    label: "Create and modify tasks"
    endpoints:
      - "POST /rest/v2/tasks"
      - "POST /rest/v2/tasks/*"
  - id: delete_tasks
    label: "Delete tasks"
    destructive: true
    endpoints:
      - "DELETE /rest/v2/tasks/*"

auth:
  type: api_key
  header: Authorization
  prefix: "Bearer "
api:
  base_url: https://api.todoist.com
---

# Todoist

API documentation here...
```

## Abilities

Abilities define what AI can do with a service. Users toggle these per account—like macOS app permissions.

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (e.g., `read_tasks`) |
| `label` | Yes | Human-readable name shown in UI |
| `read_only` | No | If `true`, this is a safe read-only ability (default: `false`) |
| `destructive` | No | If `true`, requires explicit opt-in—never auto-enabled (default: `false`) |

**Default access levels** (configurable in Settings):
- **Read only** — Auto-enable abilities with `read_only: true`
- **Full access** — Auto-enable all abilities except `destructive: true`

**Example abilities for Todoist:**
```yaml
abilities:
  - id: read_tasks
    label: "Read your tasks"
    read_only: true           # Safe, enabled with "read only" default
  - id: write_tasks
    label: "Create and modify tasks"
                              # No read_only = write ability
  - id: delete_tasks
    label: "Delete tasks"
    destructive: true         # Never auto-enabled
```

Users can have different abilities per account (e.g., Personal has full access, Work is read-only).

## Available Skills

| Skill | Category | Description |
|-------|----------|-------------|
| [Todoist](skills/todoist.md) | Productivity | Personal task management |
| [Linear](skills/linear.md) | Productivity | Issue tracking and project management |
| [Exa](skills/exa.md) | Search | Semantic web search |
| [Raindrop](skills/raindrop.md) | Productivity | Bookmark management |

## Using Skills

Skills are fetched by the Passport app when you browse and install them.

1. Open Passport → Apps tab
2. Browse available skills
3. Click "Install" on any skill
4. Connect your account (API key or OAuth)
5. Your AI agents can now use that service

## Contributing

Want to add a skill for a new service? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

