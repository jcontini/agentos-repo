# AgentOS Integrations

Open-source apps and connectors for [AgentOS](https://github.com/jcontini/agentos).

## Structure

```
├── {app-type}/           # App types (unified schemas)
│   └── readme.md         # Schema + actions + AI instructions
├── connectors/           # Provider implementations
│   └── {provider}/
│       ├── readme.md     # Auth config + provider info
│       └── {type}.yaml   # API mappings for each app type
└── to-migrate/           # Legacy apps being migrated
```

## Core Concepts

| Entity | Description |
|--------|-------------|
| **Apps** | Unified entity types (tasks, messages, calendar) with standard schemas |
| **Connectors** | Provider-specific API implementations (todoist, linear, google) |
| **Actions** | Operations: `list`, `get`, `create`, `update`, `delete` |

### How It Works

1. **Apps** define WHAT entities look like (unified schema)
2. **Connectors** define HOW to talk to each provider's API
3. **AgentOS** exposes each app as an MCP tool (e.g., `tasks.list`)

```
AI calls tasks.list(connector: "todoist")
    ↓
AgentOS loads connectors/todoist/tasks.yaml
    ↓
Executes REST call with credentials
    ↓
Returns unified task schema
```

## Current Status

### ✅ Migrated

| App Type | Connectors |
|----------|------------|
| `tasks` | todoist, linear |

### 📋 To Migrate

See `to-migrate/` folder for legacy apps that need migration:
- Messages: imessage, whatsapp, agent-history
- Calendar: apple-calendar
- Contacts: apple-contacts
- Finance: copilot
- Media: spotify, youtube
- Search: exa, firecrawl
- Tools: browser, sql, files

## Development

```bash
git clone https://github.com/jcontini/Apps-AgentOS
cd Apps-AgentOS
git config core.hooksPath .githooks
```

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for:
- App schema definition
- Connector YAML format
- Executor blocks (rest, graphql, sql, applescript)
- Security architecture

## License

MIT
