# Contributing to AgentOS Community

Declarative YAML for entities, plugins, components, apps, and themes.

**Schema reference:** `tests/plugin.schema.json` — the source of truth for plugin structure.

---

## Architecture Overview

```
entities/          Universal schemas (what a task/message/webpage IS)
  graph.yaml       Relationships between entities
  task.yaml        Task schema
  webpage.yaml     Webpage schema
  ...

plugins/           Adapters (how services map to universal entities)
  todoist/         Maps Todoist API → task entity
  exa/             Maps Exa API → webpage entity
  ...

components/        UI building blocks (TSX)
apps/              Activity → component wiring (YAML)
themes/            Visual styling (CSS)
```

**The flow:** Entities define universal schemas → Plugins adapt service APIs to those schemas → Components render the data.

---

## Entities

Entities are universal schemas that define what something IS, regardless of which service provides it.

**Location:** `entities/{entity}.yaml`

```yaml
id: task
name: Task
description: A unit of work to be done

properties:
  id: { type: string, required: true }
  title: { type: string, required: true }
  completed: { type: boolean, default: false }
  priority: { type: integer, min: 1, max: 4 }
  due_date: { type: date }
  # ...

operations: [list, get, create, update, delete, complete]
```

**Relationships** are defined in `entities/graph.yaml`:

```yaml
relationships:
  task_project:
    from: task
    to: project
    description: The project a task belongs to

  task_labels:
    from: task
    to: label
    description: Labels applied to the task
```

When creating a plugin, check `entities/{entity}.yaml` to see what properties to map.

---

## Plugins

Plugins are adapters that transform service-specific API responses into universal entities.

### Structure

```yaml
adapters:     # How API data maps to entity schemas
operations:   # Entity CRUD (returns: entity, entity[], or void)
utilities:    # Helpers with custom return shapes (optional)
```

**Examples:** `plugins/todoist/` (REST API), `plugins/apple-calendar/` (Swift/native)

### Adapters

Map API fields to entity properties. Defined once, applied to all operations.

```yaml
adapters:
  task:
    terminology: Task           # What the service calls it
    relationships:              # Which graph relationships this plugin supports
      task_project: full        # full | read_only | write_only | none
      task_labels: full
    mapping:
      id: .id
      title: .content           # API field → entity property
      completed: .is_completed
      priority: ".priority | invert:5"  # Transform if needed
      _project_id: .project_id  # Relationship data (underscore prefix)
```

**Relationship fields** use underscore prefix (`_project_id`) — these connect to `graph.yaml` relationships.

### Operations

Entity CRUD. Return type determines which adapter mapping applies.

**Naming:** `entity.operation` — `task.list`, `webpage.search`, `event.create`

**Return types:** `entity` (single), `entity[]` (array), `void` (no data returned)

```yaml
operations:
  task.list:
    description: List all tasks
    returns: task[]
    rest:
      method: GET
      url: https://api.example.com/tasks
      response:
        root: "/data"           # JSON Pointer — must start with /
```

### Executors

Each operation uses exactly one executor. Available types:

| Executor | Use case | Required fields |
|----------|----------|-----------------|
| `rest` | HTTP APIs | `url`, optional `method`, `query`, `body` |
| `graphql` | GraphQL APIs | `query`, optional `variables` |
| `sql` | Database queries | `query` |
| `swift` | macOS native APIs | `script` |
| `command` | Shell commands | `binary` |
| `csv` | CSV file parsing | `path` |

#### REST Executor

```yaml
operations:
  task.list:
    returns: task[]
    rest:
      method: GET
      url: https://api.example.com/tasks
      query:
        filter: "{{params.filter}}"
      response:
        root: "/data"
```

#### SQL Executor

```yaml
operations:
  message.list:
    returns: message[]
    sql:
      query: |
        SELECT id, text, date FROM messages
        WHERE conversation_id = '{{params.conversation_id}}'
        ORDER BY date DESC
        LIMIT {{params.limit | default: 50}}
```

#### Swift Executor (macOS only)

For native macOS APIs (EventKit, Contacts, etc.):

```yaml
operations:
  event.list:
    returns: event[]
    swift:
      script: |
        import EventKit
        import Foundation
        
        // Swift code that prints JSON to stdout
        let args = CommandLine.arguments
        let days = args.count > 1 ? Int(args[1]) ?? 7 : 7
        // ... implementation ...
        print(jsonString)
      args:
        - "{{params.days}}"
        - "{{params.calendar_id}}"
```

#### Command Executor

```yaml
operations:
  file.list:
    returns: file[]
    command:
      binary: /usr/bin/find
      args:
        - "{{params.path}}"
        - "-type"
        - "f"
```

### Template Syntax

Parameters are substituted using `{{params.name}}` syntax:

```yaml
params:
  limit: { type: integer, default: 50 }
  query: { type: string }

rest:
  url: https://api.example.com/search
  query:
    q: "{{params.query}}"
    limit: "{{params.limit}}"
```

**Filters:** `{{params.limit | default: 50}}` — provides fallback value

### Utilities

Helpers returning custom shapes (not entities).

```yaml
utilities:
  move_task:
    description: Move task to different project
    params:
      id: { type: string, required: true }
      project_id: { type: string, required: true }
    returns:
      success: boolean
    rest: ...
```

**Naming:** `verb_noun` — `move_task`, `get_teams`

### Key Rules

| Rule | Details |
|------|---------|
| JSON Pointer for `response.root` | Must start with `/` (e.g., `/data`, `/results/0`) |
| Single source of truth | Mapping in adapters, not duplicated per operation |
| Relationship fields use `_` prefix | `_project_id`, `_parent_id` |
| Handle API quirks internally | Use mutation handlers, not instructions |

### Mutation Handlers

When an API can't update a field through the normal endpoint:

```yaml
adapters:
  task:
    relationships:
      task_project:
        support: full
        mutation: move_task  # Routes project_id changes through utility
```

### Operation-Level Mapping Override

When API returns different shapes per operation:

```yaml
operations:
  webpage.search:
    returns: webpage[]
    rest:
      response:
        mapping:           # Override adapter mapping
          url: .url
          title: .title    # Search results lack full content
```

### Checklist

- [ ] `npm run validate` passes (schema validation)
- [ ] Parameters verified against API docs
- [ ] Mapping covers entity properties (`entities/{entity}.yaml`)
- [ ] Relationship fields use `_` prefix
- [ ] API quirks handled internally
- [ ] Functional tests pass (`npm test`)

---

## Components

TSX files dynamically loaded and transpiled.

**Location:** `components/{name}.tsx`

**Rules:** Import React explicitly, export default, TypeScript interfaces, no heavy deps.

**Examples:** `components/list.tsx`, `components/markdown.tsx`

---

## Apps

YAML wiring activities to components.

**Location:** `apps/{name}.yaml`

**Example:** `apps/browser.yaml`

---

## Themes

CSS and assets in `themes/{family}/{theme-id}/`.

**Example:** `themes/os/macos9/`

---

## Testing

### Test Types

| Type | Command | What it checks |
|------|---------|----------------|
| **Validation** | `npm run validate` | Schema + test coverage — run this first |
| **Functional tests** | `npm test` | Actually calls APIs, verifies behavior |

### Validation

`npm run validate` checks two things:

1. **Schema validation** — YAML structure matches `tests/plugin.schema.json`
2. **Test coverage** — every operation and utility has a test

```bash
npm run validate                    # All plugins
npm run validate -- --filter exa    # Single plugin
```

A plugin fails validation if any operation/utility lacks a test. The validator looks for `tool: 'operation.name'` in your test files.

### Functional Tests

Verify real API behavior:

```bash
npm test                                    # All tests
npx vitest run plugins/exa/tests           # Single plugin
```

### Writing Tests

Tests live in `plugins/{name}/tests/{name}.test.ts`. Every operation needs at least one test.

```typescript
import { aos, TEST_PREFIX } from '../../../tests/utils/fixtures';

describe('My Plugin', () => {
  it('operation.list returns array', async () => {
    const result = await aos().call('UsePlugin', {
      plugin: 'my-plugin',
      tool: 'entity.list',  // This tool is now marked as tested
      params: {},
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
```

See `plugins/todoist/tests/` or `plugins/apple-calendar/tests/` for comprehensive examples.

---

## Commands

```bash
npm run new-plugin <name>    # Create plugin scaffold
npm run validate             # Schema validation (run first!)
npm test                     # Functional tests
```

---

## License

MIT licensed. Contributions are MIT licensed and may be used in official releases including commercial offerings.
