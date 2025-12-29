---
id: domains
name: Domains
description: Check domain availability and lookup WHOIS registration data
icon: icon.svg
color: "#10B981"

schema:
  domain:
    domain:
      type: string
      required: true
      description: Domain name (e.g. example.com)
    available:
      type: boolean
      description: Whether the domain is available for registration
    registrar:
      type: string
      description: Registrar name
    registrant:
      type: string
      description: Registrant name/organization (often private)
    created_at:
      type: datetime
      description: Registration date
    updated_at:
      type: datetime
      description: Last updated date
    expires_at:
      type: datetime
      description: Expiration date
    nameservers:
      type: string[]
      description: List of nameservers
    status:
      type: string[]
      description: Domain status codes (clientTransferProhibited, etc.)
    raw:
      type: string
      description: Raw WHOIS response text

actions:
  whois:
    description: Get full WHOIS registration data for a domain
    readonly: true
    params:
      domain:
        type: string
        required: true
        description: Domain name to lookup (e.g. example.com)
    returns: domain

  check:
    description: Quick check if a domain is available for registration
    readonly: true
    params:
      domain:
        type: string
        required: true
        description: Domain name to check (e.g. example.com)
    returns: domain

instructions: |
  Use `whois` for full registration details (registrar, dates, nameservers).
  Use `check` for quick availability lookups.
  
  Domain names should not include protocol (no https://).
  Include the TLD (e.g. "example.com" not "example").
---

# Domains

Check domain availability and lookup WHOIS registration data.

## Actions

### whois

Get full WHOIS data for a domain.

```
Domains(action: "whois", params: {domain: "example.com"})
Domains(action: "whois", params: {domain: "google.com"})
```

Returns registrar, registration dates, nameservers, and status.

### check

Quick availability check.

```
Domains(action: "check", params: {domain: "mycoolstartup.com"})
Domains(action: "check", params: {domain: "example.ai"})
```

Returns `available: true/false` with basic info.

## Tips

- Don't include `https://` — just the domain name
- Always include the TLD (`.com`, `.io`, `.ai`, etc.)
- WHOIS data may be redacted for privacy-protected domains
