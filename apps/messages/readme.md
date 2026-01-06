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

  # ============================================================================
  # WRITE ACTIONS
  # ============================================================================

  send:
    description: Send a message to a conversation
    params:
      conversation_id:
        type: string
        required: true
        description: Conversation to send to
      text:
        type: string
        required: true
        description: Message text content
      reply_to:
        type: string
        description: Message ID to reply to (optional)
    returns: message

  send_to_user:
    description: Start a new conversation with a user
    params:
      user_id:
        type: string
        required: true
        description: User ID or handle to message
      text:
        type: string
        required: true
        description: Message text content
    returns: message

  react:
    description: Add an emoji reaction to a message
    params:
      conversation_id:
        type: string
        required: true
      message_id:
        type: string
        required: true
      emoji:
        type: string
        required: true
        description: Emoji to react with (e.g. "❤️", "👍", "😂")
    returns: { success: boolean }

  unreact:
    description: Remove a reaction from a message
    params:
      conversation_id:
        type: string
        required: true
      message_id:
        type: string
        required: true
      emoji:
        type: string
        description: Specific emoji to remove (optional, removes all if omitted)
    returns: { success: boolean }

  mark_read:
    description: Mark a message or conversation as read
    params:
      conversation_id:
        type: string
        required: true
      message_id:
        type: string
        description: Specific message to mark read (optional, marks latest if omitted)
    returns: { success: boolean }

  mark_unread:
    description: Mark a conversation as unread
    params:
      conversation_id:
        type: string
        required: true
    returns: { success: boolean }

  delete:
    description: Delete/unsend a message
    params:
      conversation_id:
        type: string
        required: true
      message_id:
        type: string
        required: true
    returns: { success: boolean }

  # ============================================================================
  # CONVERSATION ACTIONS
  # ============================================================================

  mute:
    description: Mute notifications for a conversation
    params:
      conversation_id:
        type: string
        required: true
    returns: { success: boolean }

  unmute:
    description: Unmute notifications for a conversation
    params:
      conversation_id:
        type: string
        required: true
    returns: { success: boolean }

  archive:
    description: Archive/hide a conversation
    params:
      conversation_id:
        type: string
        required: true
    returns: { success: boolean }

  # ============================================================================
  # PRESENCE & TYPING
  # ============================================================================

  get_presence:
    description: Get online/active status of users
    readonly: true
    params:
      user_ids:
        type: array
        items: { type: string }
        description: User IDs to check presence for
    returns:
      - user_id: string
        is_active: boolean
        last_active_at: datetime

  send_typing:
    description: Send typing indicator to a conversation
    params:
      conversation_id:
        type: string
        required: true
    returns: { success: boolean }

instructions: |
  When working with messages:
  - Use connector: "imessage" for iMessage/SMS (read-only)
  - Use connector: "whatsapp" for WhatsApp (read-only)
  - Use connector: "instagram" for Instagram DMs (read + write)
  - Use connector: "cursor" for AI chat history (read-only)
  
  For connectors that support write:
  - Use send() to reply in an existing conversation
  - Use send_to_user() to start a new conversation
  - Use react() / unreact() for emoji reactions
  - Use mark_read() / mark_unread() for read status
  
  Notes:
  - Phone numbers are in E.164 format: +1XXXXXXXXXX
  - Timestamps are ISO 8601 UTC
  - Not all connectors support all write actions
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

| Connector | Platform | Read | Write | Auth |
|-----------|----------|------|-------|------|
| `imessage` | iMessage, SMS, RCS | ✅ | ❌ | Local DB |
| `whatsapp` | WhatsApp | ✅ | ❌ | Local DB |
| `instagram` | Instagram DMs | ✅ | ✅ | Browser login |
| `cursor` | Cursor AI | ✅ | ❌ | Local DB |

### Write Action Support by Connector

| Action | Instagram | iMessage | WhatsApp | Cursor |
|--------|-----------|----------|----------|--------|
| `send` | ✅ | ❌ | ❌ | ❌ |
| `send_to_user` | ✅ | ❌ | ❌ | ❌ |
| `react` | ✅ | ❌ | ❌ | ❌ |
| `unreact` | ✅ | ❌ | ❌ | ❌ |
| `mark_read` | ✅ | ❌ | ❌ | ❌ |
| `mark_unread` | ✅ | ❌ | ❌ | ❌ |
| `delete` | ✅ | ❌ | ❌ | ❌ |
| `mute` | ✅ | ❌ | ❌ | ❌ |
| `unmute` | ✅ | ❌ | ❌ | ❌ |
| `send_typing` | ✅ | ❌ | ❌ | ❌ |
| `get_presence` | ✅ | ❌ | ❌ | ❌ |

## Write Actions

### send

Send a message to an existing conversation.

```
messages.send(connector: "instagram", conversation_id: "123", text: "Hello!")
```

### send_to_user

Start a new conversation with a user.

```
messages.send_to_user(connector: "instagram", user_id: "456", text: "Hey!")
```

### react

Add an emoji reaction to a message.

```
messages.react(connector: "instagram", conversation_id: "123", 
               message_id: "456", emoji: "❤️")
```

### mark_read / mark_unread

Change read status.

```
messages.mark_read(connector: "instagram", conversation_id: "123", message_id: "456")
messages.mark_unread(connector: "instagram", conversation_id: "123")
```

## Tips

- iMessage requires Full Disk Access permission on macOS
- WhatsApp requires the desktop app to be installed
- Instagram uses browser-based login (connects via Settings)
- Cursor stores conversations as JSON in a SQLite key-value store
- Group chats use `type: group` with `is_public: true/false`
- Use `is_outgoing` to filter sent vs received messages
