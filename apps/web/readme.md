---
id: web
name: Web
description: Search the web and extract content from URLs
icon: icon.svg
color: "#8B5CF6"

schema:
  result:
    id:
      type: string
      required: true
      description: Unique result identifier
    url:
      type: string
      required: true
      description: Page URL
    title:
      type: string
      required: true
      description: Page title
    snippet:
      type: string
      description: Text excerpt/summary
    content:
      type: string
      description: Full page content (markdown)
    published_at:
      type: datetime
      description: Publication date (if available)
    score:
      type: number
      description: Relevance score

actions:
  search:
    description: Search the web and return URLs with titles
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search query (natural language)
      limit:
        type: number
        default: 5
        description: Number of results (1-20)
    returns: result[]

  read:
    description: Extract content from a URL
    readonly: true
    params:
      url:
        type: string
        required: true
        description: URL to extract content from
    returns: result

instructions: |
  When searching the web:
  - Use connector: "exa" for fast semantic search (default)
  - Use connector: "firecrawl" for JS-heavy sites (React, Vue, SPAs, Notion)
  
  Workflow:
  1. Search first to find relevant URLs
  2. Read specific URLs to get full content
  
  Performance:
  - Exa is faster and cheaper, use as default
  - Firecrawl renders JavaScript, better for modern web apps
---

# Web

Search the web and extract content from URLs.

## Actions

### search

Search the web for relevant URLs.

```
Web(action: "search", params: {query: "AI agents 2025"})
Web(action: "search", params: {query: "rust async patterns", limit: 10})
```

### read

Extract full content from a URL.

```
Web(action: "read", params: {url: "https://example.com/article"})
```

For JS-heavy sites (React, Vue, Notion), use firecrawl:

```
Web(action: "read", connector: "firecrawl", params: {url: "https://notion.so/page"})
```

## Providers

| Provider | Best For | Features |
|----------|----------|----------|
| `exa` | Fast semantic search | Neural search, content extraction |
| `firecrawl` | JS-heavy sites | Browser rendering, SPA support |

## Tips

- Exa uses neural/semantic search - great for concepts and research
- Firecrawl renders JavaScript - use for React, Vue, Angular, Notion
- Both support search and read actions
- Default to exa for speed, fallback to firecrawl if needed
