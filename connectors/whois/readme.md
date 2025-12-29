---
id: whois
name: WHOIS
description: Domain lookups via system whois command
icon: icon.svg

auth:
  type: none
---

# WHOIS

Uses the system `whois` command for domain lookups. No API key required.

## Setup

The `whois` command is pre-installed on macOS and most Linux distributions.

## Notes

- Output parsing extracts common fields but may vary by TLD/registrar
- Some TLDs have rate limits on WHOIS queries
- Privacy-protected domains will show redacted registrant info
