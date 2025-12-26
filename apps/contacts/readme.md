---
id: contacts
name: Contacts
description: Unified contact management across all your address books
icon: icon.svg
color: "#5856D6"

schema:
  contact:
    id:
      type: string
      required: true
      description: Unique identifier from the source system
    first_name:
      type: string
      description: First/given name
    last_name:
      type: string
      description: Last/family name
    middle_name:
      type: string
      description: Middle name
    nickname:
      type: string
      description: Nickname or preferred name
    display_name:
      type: string
      description: Computed display name (first + last, or organization)
    organization:
      type: string
      description: Company or organization
    job_title:
      type: string
      description: Job title or role
    department:
      type: string
      description: Department within organization
    phones:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "mobile, home, work, etc." }
          value: { type: string, description: "Phone number (E.164 format preferred)" }
      description: Phone numbers with labels
    emails:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "home, work, etc." }
          value: { type: string }
      description: Email addresses with labels
    urls:
      type: array
      items:
        type: object
        properties:
          label: { type: string, description: "homepage, LinkedIn, GitHub, etc." }
          value: { type: string }
      description: URLs with labels (social profiles, websites)
    addresses:
      type: array
      items:
        type: object
        properties:
          label: { type: string }
          street: { type: string }
          city: { type: string }
          state: { type: string }
          postal_code: { type: string }
          country: { type: string }
      description: Postal addresses
    notes:
      type: string
      description: Notes or biography
    photo_url:
      type: string
      description: URL to contact photo
    birthday:
      type: string
      description: Birthday (YYYY-MM-DD or MM-DD)
    url:
      type: string
      description: Deep link to contact in source system
    created_at:
      type: datetime
    updated_at:
      type: datetime

actions:
  list:
    description: List contacts with optional filters
    readonly: true
    params:
      query:
        type: string
        description: Search by name, email, phone, or organization
      organization:
        type: string
        description: Filter by organization/company
      limit:
        type: number
        default: 50
    returns: contact[]

  get:
    description: Get a single contact by ID with full details
    readonly: true
    params:
      id:
        type: string
        required: true
        description: Contact ID
    returns: contact

  create:
    description: Create a new contact
    params:
      first_name:
        type: string
        description: First name
      last_name:
        type: string
        description: Last name
      organization:
        type: string
        description: Organization/company
      job_title:
        type: string
        description: Job title
      phone:
        type: string
        description: Phone number (auto-normalized for US)
      phone_label:
        type: string
        default: mobile
        description: Phone label
      email:
        type: string
        description: Email address
      email_label:
        type: string
        default: home
        description: Email label
      notes:
        type: string
        description: Notes
    returns: contact

  update:
    description: Update contact fields
    params:
      id:
        type: string
        required: true
        description: Contact ID
      first_name:
        type: string
        description: New first name
      last_name:
        type: string
        description: New last name
      organization:
        type: string
        description: New organization
      job_title:
        type: string
        description: New job title
      notes:
        type: string
        description: New notes
    returns: contact

  delete:
    description: Delete a contact
    params:
      id:
        type: string
        required: true
        description: Contact ID
    returns: void

  search:
    description: Search contacts by text
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search text (matches name, email, phone, organization)
      limit:
        type: number
        default: 50
    returns: contact[]

instructions: |
  When working with contacts:
  - Use connector: "apple" for macOS Contacts (iCloud synced)
  - Phone numbers are normalized to E.164 format (+1XXXXXXXXXX for US)
  - Use search for flexible queries, list for browsing
  - URLs are auto-labeled by domain (GitHub, LinkedIn, Twitter, etc.)
  - Notes can contain markdown
---

# Contacts

Unified contact management across Apple Contacts, Google Contacts, and other address books.

## Schema

The `contact` entity represents a person or organization with normalized fields.

## Actions

### list

Browse contacts with optional filters.

```
contacts.list()                              # All contacts
contacts.list(query: "John")                 # Search by name
contacts.list(organization: "Stripe")        # Filter by company
contacts.list(limit: 20)                     # Limit results
```

### get

Get full contact details.

```
contacts.get(id: "ABC123:ABPerson")
```

### search

Search contacts by any text (name, email, phone, organization).

```
contacts.search(query: "john@example.com")
contacts.search(query: "512-555")            # Partial phone
contacts.search(query: "Stripe")             # By company
```

### create

Create a new contact.

```
contacts.create(first_name: "John", last_name: "Doe", email: "john@example.com")
contacts.create(organization: "Acme Inc", phone: "5125551234")
```

### update

Update contact fields.

```
contacts.update(id: "ABC123", job_title: "Senior Engineer")
contacts.update(id: "ABC123", notes: "Met at conference 2024")
```

### delete

Delete a contact.

```
contacts.delete(id: "ABC123")
```

## Connectors

| Connector | Features | Notes |
|-----------|----------|-------|
| `apple` | Full CRUD, photos, multiple values | macOS only, uses SQL reads + AppleScript writes |

## Future Connectors

- Google Contacts (OAuth)
- CardDAV (generic)

## Tips

- macOS Contacts permission required: System Settings → Privacy & Security → Contacts
- iCloud contacts sync automatically
- Contact IDs can change after iCloud sync - always query by name after create
- US phone numbers auto-normalized: 5125551234 → +15125551234
- URL labels auto-detected: github.com → "GitHub", linkedin.com → "LinkedIn"
