---
id: messages
name: Messages
description: Unified messaging across all your communication platforms
icon: icon.svg
color: "#3B82F6"

schema:
  message:
    id:
      type: string
      required: true
      description: Unique identifier from the source system
    conversation_id:
      type: string
      required: true
      description: ID of the conversation this message belongs to
    content:
      type: string
      description: Text content of the message
    content_type:
      type: enum
      values: [text, rich_text, html, markdown]
      required: true
      description: Format of the content
    sender:
      type: object
      required: true
      properties:
        id: { type: string }
        type: { type: enum, values: [user, bot, system, webhook] }
        name: { type: string }
        handle: { type: string, description: "Phone/email/username" }
        is_self: { type: boolean }
      description: Who sent the message
    is_outgoing:
      type: boolean
      description: True if sent by current user (shortcut for sender.is_self)
    timestamp:
      type: datetime
      required: true
      description: When the message was sent
    edited_at:
      type: datetime
      description: When the message was last edited
    is_read:
      type: boolean
      description: Read status
    delivered_at:
      type: datetime
      description: When delivered (iMessage, WhatsApp)
    read_at:
      type: datetime
      description: When read (iMessage, WhatsApp)
    attachments:
      type: array
      items: { type: object }
      description: Files, images, audio, video
    reply_to:
      type: object
      properties:
        message_id: { type: string }
        preview: { type: string }
      description: Reference to parent message if this is a reply
    thread_id:
      type: string
      description: Thread identifier (Slack, Discord)
    reactions:
      type: array
      items: { type: object }
      description: Emoji reactions
    mentions:
      type: array
      items: { type: object }
      description: Users/roles mentioned
    # Email-specific
    subject:
      type: string
      description: Email subject line (Gmail)
    recipients:
      type: object
      properties:
        to: { type: array }
        cc: { type: array }
        bcc: { type: array }
      description: Email recipients (to/cc/bcc)
    # Platform-specific
    is_pinned:
      type: boolean
      description: Pinned message (Slack, Discord)
    is_deleted:
      type: boolean
      description: Message was recalled/unsent

  conversation:
    id:
      type: string
      required: true
      description: Unique identifier
    type:
      type: enum
      values: [direct, group, thread, ai_chat, email_thread]
      required: true
      description: Type of conversation
    name:
      type: string
      description: Display name (group name, email subject, etc.)
    participants:
      type: array
      items: { type: object }
      description: List of participants
    platform:
      type: string
      description: Source platform (iMessage, WhatsApp, Slack, etc.)
    is_public:
      type: boolean
      description: Public channel vs private group (Slack, Discord)
    is_archived:
      type: boolean
      description: Archived/closed conversation
    is_muted:
      type: boolean
      description: Notifications muted
    unread_count:
      type: integer
      description: Number of unread messages
    created_at:
      type: datetime
    updated_at:
      type: datetime
    # AI-specific
    model:
      type: string
      description: AI model used (Cursor, Claude, ChatGPT)

  attachment:
    id:
      type: string
      required: true
    type:
      type: enum
      values: [image, video, audio, file, voice_note, sticker, poll]
      required: true
    filename:
      type: string
    mime_type:
      type: string
    url:
      type: string
      description: URL to access the file
    local_path:
      type: string
      description: Local file path (for local connectors)
    size_bytes:
      type: integer
    duration_secs:
      type: number
      description: Duration for audio/video
    transcript:
      type: string
      description: AI-generated transcript

actions:
  list:
    description: List messages in a conversation
    readonly: true
    params:
      conversation_id:
        type: string
        required: true
        description: Conversation to list messages from
      limit:
        type: number
        default: 100
    returns: message[]

  get:
    description: Get a specific message
    readonly: true
    params:
      message_id:
        type: string
        required: true
      conversation_id:
        type: string
        description: Required for some connectors (Cursor)
    returns: message

  search:
    description: Search messages by text content
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Text to search for
      conversation_id:
        type: string
        description: Limit search to a conversation
      limit:
        type: number
        default: 50
    returns: message[]

  list_conversations:
    description: List all conversations
    readonly: true
    params:
      limit:
        type: number
        default: 50
      type:
        type: string
        description: Filter by type (direct, group, ai_chat)
    returns: conversation[]

  get_conversation:
    description: Get conversation details
    readonly: true
    params:
      conversation_id:
        type: string
        required: true
    returns: conversation

  get_unread:
    description: Get all unread messages
    readonly: true
    params:
      limit:
        type: number
        default: 50
    returns: message[]

instructions: |
  When working with messages:
  - All message connectors are read-only (no sending)
  - Use connector: "imessage" for iMessage/SMS
  - Use connector: "whatsapp" for WhatsApp
  - Use connector: "cursor" for AI chat history
  - Phone numbers are in E.164 format: +1XXXXXXXXXX
  - Timestamps are ISO 8601 UTC
---

# Messages

Unified messaging across all your communication platforms.

## Schema

The `message` entity represents a message from any source with a normalized schema.

### Conversation Types

| Type | Description | Examples |
|------|-------------|----------|
| `direct` | 1:1 private message | iMessage DM, WhatsApp DM |
| `group` | Multi-person conversation | WhatsApp group, Slack channel |
| `thread` | Reply thread within a group | Slack thread, Discord thread |
| `ai_chat` | Human-to-AI conversation | Cursor composer |
| `email_thread` | Email thread | Gmail thread |

### Sender Types

| Type | Description |
|------|-------------|
| `user` | Human user |
| `bot` | AI assistant or bot |
| `system` | System notification |
| `webhook` | Automated integration |

## Actions

### list

List messages from a conversation.

```
messages.list(conversation_id: "123", connector: "imessage")
messages.list(conversation_id: "abc-uuid", connector: "cursor", limit: 50)
```

### search

Search messages by text content.

```
messages.search(query: "dinner", connector: "whatsapp")
messages.search(query: "fix bug", connector: "cursor")
```

### list_conversations

List all conversations.

```
messages.list_conversations(connector: "imessage")
messages.list_conversations(connector: "whatsapp", limit: 20)
```

### get_unread

Get unread messages.

```
messages.get_unread(connector: "imessage")
messages.get_unread(connector: "whatsapp")
```

## Connectors

| Connector | Platform | Features |
|-----------|----------|----------|
| `imessage` | iMessage, SMS, RCS | Read messages, attachments, read receipts |
| `whatsapp` | WhatsApp | Read messages, group participants |
| `cursor` | Cursor AI | Read AI chat history |

## Tips

- iMessage requires Full Disk Access permission on macOS
- WhatsApp requires the desktop app to be installed
- Cursor stores conversations as JSON in a SQLite key-value store
- Group chats use `type: group` with `is_public: true/false`
- Use `is_outgoing` to filter sent vs received messages
