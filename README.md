# AgentOS Integrations

Open-source connectors for [AgentOS](https://github.com/jcontini/agentos).

## What's Here

```
connectors/
  linear/           # Each connector is a folder
    readme.md       # YAML config + markdown docs
    icon.png        # Square icon
    tests/          # Optional integration tests
  todoist/
  hardcover/
  demo/             # Example connector for learning
  ...
```

## Quick Example

```yaml
# connectors/myservice/readme.md
---
id: myservice
name: My Service
description: Connect to My Service API
tags: [tasks]

auth:
  type: api_key
  header: Authorization

actions:
  list:
    description: List items
    readonly: true
    rest:
      method: GET
      url: "https://api.myservice.com/items"
      response:
        mapping:
          id: "[].id"
          name: "[].name"
---

# My Service

Human-readable documentation here.
```

## Current Connectors

| Category | Connectors |
|----------|------------|
| Tasks | todoist, linear |
| Messages | imessage, whatsapp |
| Databases | postgres, sqlite, mysql |
| Calendar | apple-calendar |
| Contacts | apple-contacts |
| Web | exa, firecrawl, reddit |
| Books | hardcover, goodreads |

## Development

```bash
git clone https://github.com/jcontini/agentos-integrations
cd agentos-integrations
npm install    # Sets up pre-commit hooks
```

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- Connector YAML format
- Executor blocks (rest, graphql, sql, swift, command)
- Auth configuration
- Testing

## License

MIT
