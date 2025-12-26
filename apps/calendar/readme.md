---
id: calendar
name: Calendar
description: Unified calendar management across all your scheduling tools
icon: icon.svg
color: "#FF3B30"

schema:
  event:
    id:
      type: string
      required: true
      description: Unique identifier from the source system
    title:
      type: string
      required: true
      description: Event title/summary
    description:
      type: string
      description: Event description or notes (markdown supported)
    start:
      type: datetime
      required: true
      description: Start date/time (ISO 8601)
    end:
      type: datetime
      required: true
      description: End date/time (ISO 8601)
    all_day:
      type: boolean
      description: True if this is an all-day event
    location:
      type: string
      description: Event location (address or virtual meeting URL)
    calendar:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        color: { type: string, description: "Hex color code" }
      description: Calendar this event belongs to
    status:
      type: enum
      values: [confirmed, tentative, cancelled]
      description: Event status
    organizer:
      type: object
      properties:
        name: { type: string }
        email: { type: string }
      description: Event organizer
    attendees:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          email: { type: string }
          status: { type: enum, values: [accepted, declined, tentative, pending] }
          optional: { type: boolean }
      description: Event attendees with RSVP status
    recurrence:
      type: object
      properties:
        rule: { type: string, description: "RRULE string (RFC 5545)" }
        exceptions: { type: array, items: { type: datetime } }
      description: Recurrence rule for repeating events
    url:
      type: string
      description: Deep link to event in source system
    created_at:
      type: datetime
    updated_at:
      type: datetime

  calendar:
    id:
      type: string
      required: true
    name:
      type: string
      required: true
    color:
      type: string
      description: Hex color code
    is_primary:
      type: boolean
      description: True if this is the default calendar
    is_readonly:
      type: boolean
      description: True if calendar is read-only (subscribed)

actions:
  list:
    description: List calendar events within a date range
    readonly: true
    params:
      start:
        type: string
        description: Start date (YYYY-MM-DD or 'today', default today)
      end:
        type: string
        description: End date (YYYY-MM-DD, default 7 days from start)
      days:
        type: number
        description: Number of days from start (alternative to end)
      calendar_id:
        type: string
        description: Filter by calendar ID
      query:
        type: string
        description: Search by title, location, or description
      limit:
        type: number
        default: 50
    returns: event[]

  get:
    description: Get a single event by ID
    readonly: true
    params:
      id:
        type: string
        required: true
        description: Event ID
    returns: event

  create:
    description: Create a new calendar event
    params:
      title:
        type: string
        required: true
        description: Event title
      start:
        type: string
        required: true
        description: Start date/time (YYYY-MM-DD HH:MM or YYYY-MM-DD for all-day)
      end:
        type: string
        description: End date/time (defaults to 1 hour after start, or same day for all-day)
      all_day:
        type: boolean
        description: Create as all-day event
      location:
        type: string
        description: Event location
      description:
        type: string
        description: Event description/notes
      calendar_id:
        type: string
        description: Target calendar ID (uses default if not specified)
    returns: event

  update:
    description: Update an existing event
    params:
      id:
        type: string
        required: true
        description: Event ID
      title:
        type: string
        description: New title
      start:
        type: string
        description: New start date/time
      end:
        type: string
        description: New end date/time
      location:
        type: string
        description: New location
      description:
        type: string
        description: New description
      calendar_id:
        type: string
        description: Move to different calendar
    returns: event

  delete:
    description: Delete a calendar event
    params:
      id:
        type: string
        required: true
        description: Event ID
    returns: void

  calendars:
    description: List all available calendars
    readonly: true
    params: {}
    returns: calendar[]

instructions: |
  When working with calendar:
  - Use connector: "apple" for macOS Calendar (iCloud, Google via macOS)
  - Dates can be "today", "tomorrow", or YYYY-MM-DD format
  - Times are in 24-hour format: YYYY-MM-DD HH:MM
  - All-day events use just the date: YYYY-MM-DD
  - Recurring events: updates/deletes only affect single occurrence by default
  - Attendees are read-only (managed by calendar apps)
---

# Calendar

Unified calendar management across Apple Calendar, Google Calendar, and other scheduling tools.

## Schema

The `event` entity represents a calendar event with a normalized schema.

### Status Values

| Status | Description |
|--------|-------------|
| `confirmed` | Event is confirmed |
| `tentative` | Tentatively scheduled |
| `cancelled` | Event was cancelled |

### Attendee Status

| Status | Description |
|--------|-------------|
| `accepted` | Attendee accepted |
| `declined` | Attendee declined |
| `tentative` | Attendee tentatively accepted |
| `pending` | No response yet |

## Actions

### list

List events in a date range.

```
calendar.list()                                    # Next 7 days
calendar.list(days: 1)                             # Today only
calendar.list(start: "2025-01-01", end: "2025-01-31")  # Specific range
calendar.list(query: "standup", days: 30)          # Search upcoming events
calendar.list(calendar_id: "work")                 # Specific calendar
```

### get

Get full event details including attendees and recurrence.

```
calendar.get(id: "ABC123:XYZ")
```

### create

Create a new event.

```
calendar.create(title: "Team Sync", start: "2025-01-15 10:00")
calendar.create(title: "Vacation", start: "2025-01-20", all_day: true)
calendar.create(title: "Dinner", start: "2025-01-15 19:00", location: "Uchi Austin")
```

### update

Update an existing event.

```
calendar.update(id: "ABC123", location: "Zoom")
calendar.update(id: "ABC123", start: "2025-01-15 15:00")  # Reschedule
calendar.update(id: "ABC123", calendar_id: "work")        # Move calendar
```

### delete

Delete an event.

```
calendar.delete(id: "ABC123")
```

### calendars

List all available calendars.

```
calendar.calendars()
```

## Connectors

| Connector | Features | Notes |
|-----------|----------|-------|
| `apple` | Full CRUD, attendees, recurrence | Uses EventKit, macOS only |

## Future Connectors

- Google Calendar (OAuth)
- Outlook Calendar (OAuth)
- Fastmail Calendar (CalDAV)

## Tips

- macOS Calendar permission required: System Settings → Privacy & Security → Calendars
- iCloud/Google calendars configured in macOS Calendar.app work automatically
- Subscribed calendars (ICS feeds) are read-only
- Recurring event operations affect only the single occurrence by default
