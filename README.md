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

