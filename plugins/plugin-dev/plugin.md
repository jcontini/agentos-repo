---
id: plugin-dev
name: Plugin Development
description: Guide for building, auditing, and updating AgentOS plugins
icon: material-symbols:build
color: "#10B981"

auth:
  type: local

requires:
  - yq

actions:
  audit:
    readonly: true
    description: Audit a plugin for common issues and best practices
    params:
      path:
        type: string
        required: true
        description: Path to the plugin.md file to audit
    run: |
      require_file "$PARAM_PATH"
      
      echo "# Plugin Audit: $PARAM_PATH"
      echo ""
      
      # Extract frontmatter to temp file for yq
      TMPYAML=$(mktemp)
      trap "rm -f $TMPYAML" EXIT
      sed -n '/^---$/,/^---$/p' "$PARAM_PATH" | sed '1d;$d' > "$TMPYAML"
      
      # Check required fields
      echo "## Required Fields"
      for field in id name description category; do
        VAL=$(yq ".$field" "$TMPYAML" | grep -v '^null$')
        if [ -n "$VAL" ]; then
          echo "✅ $field: $VAL"
        else
          echo "❌ $field: MISSING"
        fi
      done
      echo ""
      
      # Check icon format
      echo "## Icon"
      ICON=$(yq '.icon' "$TMPYAML" | grep -v '^null$')
      if [ -n "$ICON" ]; then
        if echo "$ICON" | grep -q ":"; then
          echo "✅ Iconify format: $ICON"
        elif echo "$ICON" | grep -q "^http"; then
          echo "✅ URL format: $ICON"
        else
          echo "⚠️  Unknown icon format: $ICON"
        fi
      else
        echo "⚠️  No icon defined"
      fi
      echo ""
      
      # Check for forbidden patterns
      echo "## Error Handling"
      FOUND_ISSUES=0
      if grep -q '2>/dev/null' "$PARAM_PATH"; then
        echo "❌ Found '2>/dev/null' - hides errors from activity log"
        FOUND_ISSUES=1
      fi
      if grep -q '2>&-' "$PARAM_PATH"; then
        echo "❌ Found '2>&-' - closes stderr"
        FOUND_ISSUES=1
      fi
      if grep -q '&>/dev/null' "$PARAM_PATH"; then
        echo "❌ Found '&>/dev/null' - hides all output"
        FOUND_ISSUES=1
      fi
      if [ $FOUND_ISSUES -eq 0 ]; then
        echo "✅ No forbidden error suppression patterns"
      fi
      echo ""
      
      # Check for helpers usage
      echo "## Helpers"
      HELPERS=$(yq '.helpers' "$TMPYAML" | grep -v '^null$')
      if [ -n "$HELPERS" ]; then
        echo "✅ Uses helpers block for shared logic"
      else
        ACTIONS=$(yq '.actions | keys | length' "$TMPYAML")
        if [ "$ACTIONS" -gt 1 ]; then
          echo "⚠️  Multiple actions ($ACTIONS) but no helpers block"
        else
          echo "ℹ️  No helpers block (may not need one)"
        fi
      fi
      echo ""
      
      # Check actions for AI-friendliness
      echo "## Actions"
      HAS_READONLY=0
      yq '.actions | keys | .[]' "$TMPYAML" | while read -r action; do
        DESC=$(yq ".actions.$action.description" "$TMPYAML" | grep -v '^null$')
        READONLY=$(yq ".actions.$action.readonly" "$TMPYAML")
        
        # Check action name length
        if [ ${#action} -gt 15 ]; then
          echo "⚠️  $action: name too long (${#action} chars) - keep under 15"
        fi
        
        # Check description
        if [ -n "$DESC" ]; then
          DESC_LEN=${#DESC}
          if [ $DESC_LEN -gt 50 ]; then
            echo "⚠️  $action: description too long ($DESC_LEN chars) - keep under 50"
          else
            echo "✅ $action: $DESC"
          fi
        else
          echo "❌ $action: missing description"
        fi
        
        # Track readonly
        if [ "$READONLY" = "true" ]; then
          HAS_READONLY=1
        fi
      done
      echo ""
      
      # Check for readonly actions (AI-first design)
      echo "## AI-First Design"
      READONLY_COUNT=$(yq '[.actions[] | select(.readonly == true)] | length' "$TMPYAML")
      ACTION_COUNT=$(yq '.actions | keys | length' "$TMPYAML")
      if [ "$READONLY_COUNT" -eq 0 ]; then
        echo "⚠️  No readonly actions - mark read-only actions with 'readonly: true' for one-shot AI calls"
      else
        echo "✅ $READONLY_COUNT/$ACTION_COUNT actions marked readonly"
      fi
      
      # Check for token-inefficient patterns in markdown body
      if grep -q '•' "$PARAM_PATH"; then
        echo "⚠️  Uses '•' bullets - use '-' instead (fewer tokens)"
      fi
      if grep -q '—' "$PARAM_PATH"; then
        echo "⚠️  Uses '—' em-dash - use ':' or '-' instead (fewer tokens)"
      fi
      echo ""
      
      echo "✅ Audit complete"
---

# Plugin Development Guide

Use this guide when building, auditing, or updating AgentOS plugins.

## Plugin Structure

Plugins live in `plugins/{id}/plugin.md` with YAML frontmatter + markdown body.

```yaml
---
id: my-plugin
name: My Plugin
description: What it does (one line)
icon: material-symbols:icon-name  # Iconify format OR URL
color: "#hexcolor"

# Authentication (pick one)
auth:
  type: local  # No credentials needed

# OR
auth:
  type: api_key
  header: Authorization  # or X-Api-Key, etc.
  prefix: "Bearer "      # prefix before key
  help_url: https://...  # where to get the key

# Dependencies
requires:
  - curl  # Simple: binary name
  - name: yt-dlp  # Structured: with install commands
    install:
      macos: brew install yt-dlp
      linux: sudo apt install -y yt-dlp

# Shared functions (available to all actions)
helpers: |
  my_helper() {
    echo "reusable logic"
  }

# User-configurable settings
settings:
  num_results:
    label: Number of Results
    type: integer
    default: "5"
    min: 1
    max: 100
  mode:
    label: Mode
    type: enum
    default: "auto"
    options: [auto, fast, thorough]

actions:
  my_action:
    description: What this action does
    params:
      query:
        type: string
        required: true
        description: What this param is for
      limit:
        type: integer
        default: "10"
    run: |
      echo "Query: $PARAM_QUERY, Limit: $PARAM_LIMIT"
---

# My Plugin

Instructions for AI go here...
```

## Environment Variables

These are auto-injected into every `run:` script:

| Variable | Description |
|----------|-------------|
| `PARAM_{NAME}` | Each param value (uppercased) |
| `PARAM_ACTION` | The action being called |
| `PLUGIN_DIR` | Path to plugin folder (for scripts/) |
| `AUTH_TOKEN` | Credential if auth configured |
| `SETTING_{NAME}` | Plugin settings (uppercased) |
| `AGENTOS_DOWNLOADS` | User's downloads folder |
| `AGENTOS_CACHE` | Cache directory |
| `AGENTOS_DATA` | Data directory |

## Built-in Helper Functions

Available in all `run:` scripts:

```bash
error "message"      # Print to stderr and exit 1
warn "message"       # Print warning to stderr
downloads            # Echo the downloads path
require_file "path"  # Error if file doesn't exist
require_dir "path"   # Error if dir doesn't exist
```

## The `helpers:` Block

Define shared functions used by multiple actions:

```yaml
helpers: |
  ensure_deps() {
    command -v jq || error "jq required"
  }
  
  call_api() {
    curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$1"
  }

actions:
  list:
    run: |
      ensure_deps
      call_api "https://api.example.com/items" | jq .
  
  get:
    run: |
      ensure_deps
      call_api "https://api.example.com/items/$PARAM_ID" | jq .
```

## Plugins with Scripts

For complex logic, use a `scripts/` folder:

```
plugins/
  browser/
    plugin.md
    scripts/
      browser.mjs   # Node.js, Python, etc.
```

Reference via `$PLUGIN_DIR`:

```yaml
helpers: |
  browser() {
    node "$PLUGIN_DIR/scripts/browser.mjs"
  }

actions:
  click:
    run: browser
```

## Icons

Two formats supported:

1. **Iconify** (preferred): `icon: material-symbols:web`
2. **URL**: `icon: https://cdn.simpleicons.org/todoist`

Browse icons: https://icon-sets.iconify.design/

## Categories

| Category | Use for |
|----------|---------|
| `productivity` | Tasks, notes, bookmarks |
| `communication` | Email, messaging |
| `search` | Web search, extraction |
| `code` | GitHub, dev tools |
| `finance` | Banking, payments |
| `media` | Video, audio, images |

Unknown categories automatically map to "Other".

## AI-First Design

Plugins are used by AI agents. Design from their perspective.

### Naming

Action and param names should be short, clear verbs:

- **Good**: `list`, `get`, `create`, `search`, `query`, `id`, `filter`
- **Bad**: `get_all_items_from_database`, `inputQueryString`, `fetchUserData`

Keep action names under 15 characters.

### Descriptions

Keep descriptions under 50 characters. Be direct:

- **Good**: `List all tasks` (14 chars)
- **Bad**: `This action retrieves all tasks from the database` (50 chars)

### Token Efficiency

In your markdown documentation, use token-efficient formatting:

- Use `-` not `•` for bullets (1 token vs 2-3)
- Use `:` or `-` not `—` for separators (1 token vs 2-3)
- Use tabs not spaces for indentation (1 token)

### Read-Only Actions

Mark safe actions with `readonly: true` so they appear inline in UseTool:

```yaml
actions:
  list:
    description: List all tasks
    readonly: true  # Appears in one-shot list
  create:
    description: Create a task
    # readonly defaults to false - requires ToolHelp first
```

Read-only actions let AI call them immediately without calling ToolHelp first.

### Helpful Errors

When something fails, tell the AI how to fix it:

```bash
# Bad
error "Invalid parameter"

# Good
error "Missing id param. Usage: get(id). Call ToolHelp(tool='my-plugin') for details."
```

## Best Practices

### Do

- Use `helpers:` for shared logic
- Use `error()` for failures (visible in activity log)
- Keep `run:` blocks simple (call helpers)
- Use `$PLUGIN_DIR` for scripts, not hardcoded paths
- Return JSON for structured data
- Mark read-only actions with `readonly: true`
- Keep action names short (under 15 chars)
- Keep descriptions concise (under 50 chars)

### Don't

- Suppress stderr (`2>/dev/null` hides errors)
- Use complex inline scripts (use helpers or scripts/)
- Hardcode paths (use env vars)
- Ignore exit codes
- Use long verbose action names
- Use token-heavy formatting (bullets, em-dashes)

## Param Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Number |
| `boolean` | true/false |

## Settings Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Number with optional `min`/`max` |
| `boolean` | Toggle (default as `"true"` or `"false"` string) |
| `enum` | Dropdown with `options` array |

## macOS Permissions

For plugins accessing protected resources:

```yaml
permissions:
  - full_disk_access   # Messages, Mail, Safari DBs
  - contacts           # Contacts database
  - calendar           # Calendar/Reminders
  - automation:Finder  # AppleScript control
```

## Testing Locally

1. Fork the plugins repo
2. In AgentOS Settings → Developer, set plugins source to your local path
3. Changes hot-reload automatically

## Auditing Plugins

When reviewing a plugin, check:

1. **Structure**: Valid YAML, required fields present
2. **Errors**: No stderr suppression, uses `error()` helper
3. **Helpers**: Shared logic extracted to `helpers:` block
4. **Paths**: Uses `$PLUGIN_DIR`, `$AGENTOS_DOWNLOADS`, not hardcoded
5. **Params**: All required params have descriptions
6. **Docs**: Markdown body explains usage clearly
7. **AI-First**: Short names, concise descriptions, readonly marked, token-efficient

The audit tool checks all of these automatically.


## Cursor MCP Connection Issues

During plugin development, Cursor's MCP connection can get stuck or disabled. To fix:

```bash
# Toggle the MCP config to force reconnect (MUST wait 1 second between renames)
mv ~/.cursor/mcp.json ~/.cursor/mcp.json.tmp
sleep 1
mv ~/.cursor/mcp.json.tmp ~/.cursor/mcp.json
```

This renames the config and back, triggering Cursor to re-read and reconnect. Do this whenever you get "Not connected" errors from AgentOS tools.

## Contributing Plugins

To contribute a plugin to the public repo:

1. Fork the [AgentOS-Plugins](https://github.com/jcontini/AgentOS-Plugins) repo
2. Create your plugin in `plugins/{id}/plugin.md`
3. Run the audit tool to check for issues:
   ```
   UseTool(tool: "plugin-dev", action: "audit", params: {path: "plugins/my-plugin/plugin.md"})
   ```
4. Test locally by setting your fork as the plugins source in AgentOS Settings
5. Submit a PR

The audit tool checks for common issues before you submit.
