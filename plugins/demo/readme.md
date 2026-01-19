---
id: demo
name: Demo
description: Fun demos using free public APIs - no API keys needed!
icon: icon.svg
tags: [demo, fun, examples]

# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTERS
# ═══════════════════════════════════════════════════════════════════════════════
# Entity adapters for mock implementations (testing only)

adapters:
  webpage:
    terminology: Web Page
    mapping: {}  # No real mapping - demo returns synthetic data

  task:
    terminology: Task
    mapping: {}

  contact:
    terminology: Contact
    mapping: {}

# ═══════════════════════════════════════════════════════════════════════════════
# OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════
# Mock entity operations for testing apps

operations:
  webpage.search:
    description: Mock web search (returns sample results)
    returns: webpage[]
    params:
      query: { type: string, description: "Search query" }
    rest:
      method: GET
      url: "https://httpbin.org/anything?query={{params.query}}"
      response:
        mapping:
          results: "[{\"url\": \"https://example.com/1\", \"title\": \"Result for {{params.query}}\", \"snippet\": \"This is a mock search result for testing.\"}]"

  webpage.read:
    description: Mock webpage read (returns sample content)
    returns: webpage
    params:
      url: { type: string, description: "URL to read" }
    rest:
      method: GET
      url: "https://httpbin.org/anything?url={{params.url}}"
      response:
        mapping:
          url: ".args.url"
          title: "'Mock Page Title'"
          content: "'# Mock Content\\n\\nThis is mock webpage content for testing the entity-based architecture.'"

  task.list:
    description: Mock task list
    returns: task[]
    rest:
      method: GET
      url: "https://httpbin.org/anything?action=task.list"
      response:
        mapping:
          tasks: "[{\"id\": \"1\", \"title\": \"Mock task 1\", \"completed\": false}, {\"id\": \"2\", \"title\": \"Mock task 2\", \"completed\": true}]"

  task.create:
    description: Mock task creation
    returns: task
    params:
      title: { type: string, description: "Task title" }
    rest:
      method: POST
      url: "https://httpbin.org/anything"
      body:
        action: task.create
        title: "{{params.title}}"
      response:
        mapping:
          id: "'new-task-id'"
          title: ".json.title"
          completed: "false"

  contact.list:
    description: Mock contact list
    returns: contact[]
    rest:
      method: GET
      url: "https://httpbin.org/anything?action=contact.list"
      response:
        mapping:
          contacts: "[{\"id\": \"1\", \"name\": \"Alice Smith\", \"email\": \"alice@example.com\"}, {\"id\": \"2\", \"name\": \"Bob Jones\", \"email\": \"bob@example.com\"}]"

  contact.get:
    description: Mock get contact by ID
    returns: contact
    params:
      id: { type: string, description: "Contact ID" }
    rest:
      method: GET
      url: "https://httpbin.org/anything?action=contact.get&id={{params.id}}"
      response:
        mapping:
          id: ".args.id"
          name: "'Mock Contact'"
          email: "'mock@example.com'"
          phone: "'+1-555-0123'"

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════
# Fun demos and testing tools (return custom shapes, not entities)

utilities:
  get_weather:
    description: Get current weather for a city
    params:
      city: { type: string, description: "City name", example: "Austin" }
    returns:
      location: string
      temp_f: string
      temp_c: string
      condition: string
      humidity: string
      wind_mph: string
    rest:
      method: GET
      url: "https://wttr.in/{{params.city}}?format=j1"
      response:
        root: "/current_condition/0"
        mapping:
          location: "'{{params.city}}'"
          temp_f: ".temp_F"
          temp_c: ".temp_C"
          condition: ".weatherDesc[0].value"
          humidity: ".humidity"
          wind_mph: ".windspeedMiles"

  get_ip:
    description: Get your public IP and location info
    returns:
      ip: string
      city: string
      region: string
      country: string
      isp: string
      lat: number
      lon: number
    rest:
      method: GET
      url: "http://ip-api.com/json/"
      response:
        mapping:
          ip: ".query"
          city: ".city"
          region: ".regionName"
          country: ".country"
          isp: ".isp"
          lat: ".lat"
          lon: ".lon"

  get_iss_position:
    description: Get current position of the International Space Station
    returns:
      latitude: string
      longitude: string
      timestamp: number
    rest:
      method: GET
      url: "http://api.open-notify.org/iss-now.json"
      response:
        mapping:
          latitude: ".iss_position.latitude"
          longitude: ".iss_position.longitude"
          timestamp: ".timestamp"

  get_next_launch:
    description: Get info about the next SpaceX launch
    returns:
      name: string
      date_utc: string
      rocket: string
      details: string
      webcast: string
    rest:
      method: GET
      url: "https://api.spacexdata.com/v5/launches/next"
      response:
        mapping:
          name: ".name"
          date_utc: ".date_utc"
          rocket: ".rocket"
          details: ".details"
          webcast: ".links.webcast"

  get_joke:
    description: Get a random programming joke
    returns:
      setup: string
      punchline: string
    rest:
      method: GET
      url: "https://official-joke-api.appspot.com/jokes/programming/random"
      response:
        root: "/0"
        mapping:
          setup: ".setup"
          punchline: ".punchline"

  get_fact:
    description: Get a random useless fact
    returns:
      fact: string
      source: string
    rest:
      method: GET
      url: "https://uselessfacts.jsph.pl/api/v2/facts/random"
      response:
        mapping:
          fact: ".text"
          source: ".source"

  echo:
    description: Echo back a message (for testing)
    params:
      message: { type: string, description: "Message to echo" }
    returns:
      message: string
    command:
      binary: echo
      args: ["{{params.message}}"]

  http_get:
    description: Test HTTP GET request via httpbin
    returns:
      origin: string
      url: string
    rest:
      method: GET
      url: "https://httpbin.org/get"
      response:
        mapping:
          origin: ".origin"
          url: ".url"

instructions: |
  Demo plugin for testing AgentOS. All actions use free APIs - no keys needed!
  
  Mock entity operations (for testing apps):
  - webpage.search/read: Mock web search and page content
  - task.list/create: Mock task management
  - contact.list/get: Mock contact lookups
  
  Fun utilities:
  - get_weather: Get weather for any city
  - get_ip: See your public IP and location
  - get_iss_position: Track the International Space Station
  - get_joke: Get a programming joke
---

# Demo

Test harness and showcase plugin. Uses free public APIs - no keys required!

## Mock Entity Operations

For testing the entity-based architecture without real credentials:

| Operation | Returns | What it does |
|-----------|---------|--------------|
| `webpage.search` | `webpage[]` | Mock web search results |
| `webpage.read` | `webpage` | Mock page content |
| `task.list` | `task[]` | Mock task list |
| `task.create` | `task` | Mock task creation |
| `contact.list` | `contact[]` | Mock contact directory |
| `contact.get` | `contact` | Mock contact lookup |

## Utilities

| Utility | What it does |
|---------|--------------|
| `get_weather` | Current weather for any city (wttr.in) |
| `get_ip` | Your public IP and location (ip-api.com) |
| `get_iss_position` | Current ISS position (open-notify.org) |
| `get_next_launch` | Next SpaceX launch (spacexdata.com) |
| `get_joke` | Random programming joke |
| `get_fact` | Random useless fact |
| `echo` | Echo a message (for testing) |
| `http_get` | Test HTTP via httpbin |

## Examples

```
# Entity operations
UsePlugin(plugin: "demo", tool: "webpage.search", params: {query: "test"})
UsePlugin(plugin: "demo", tool: "task.list")
UsePlugin(plugin: "demo", tool: "contact.get", params: {id: "1"})

# Utilities
UsePlugin(plugin: "demo", tool: "get_weather", params: {city: "Austin"})
UsePlugin(plugin: "demo", tool: "get_joke")
```

## For Contributors

This plugin demonstrates:
- New plugin format: `adapters` + `operations` + `utilities`
- Operations return typed entities (`returns: task[]`)
- Utilities return custom shapes with inline schemas
- REST API calls with response mapping
- Shell commands (`echo`)
