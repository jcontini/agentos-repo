---
id: finance
name: Finance
description: Manage personal finances - transactions, budgets, and spending analysis
icon: icon.svg
color: "#00C853"

schema:
  transaction:
    id:
      type: string
      description: Unique transaction identifier
    merchant:
      type: string
      description: Merchant or payee name
    amount:
      type: number
      description: Transaction amount (negative = expense, positive = income)
    date:
      type: string
      description: Transaction date (YYYY-MM-DD)
    category_id:
      type: string
      description: Category identifier
    pending:
      type: boolean
      description: Whether transaction is pending
    recurring:
      type: boolean
      description: Whether this is a recurring transaction
    reviewed:
      type: boolean
      description: Whether user has reviewed this transaction
    note:
      type: string
      description: User-added note

actions:
  list:
    description: List recent transactions
    readonly: true
    params:
      limit:
        type: number
        default: 30
        description: Maximum transactions to return
    returns:
      type: array
      items:
        $ref: "#/schema/transaction"

  get:
    description: Get a specific transaction by ID
    readonly: true
    params:
      id:
        type: string
        required: true
        description: Transaction ID
    returns:
      $ref: "#/schema/transaction"

  search:
    description: Search transactions
    readonly: true
    params:
      query:
        type: string
        required: true
        description: Search query (merchant name)
      limit:
        type: number
        default: 30
        description: Maximum results
    returns:
      type: array
      items:
        $ref: "#/schema/transaction"

  spending_by_month:
    description: Get monthly spending totals
    readonly: true
    params:
      months:
        type: number
        default: 3
        description: Number of months to analyze
    returns:
      type: array
      items:
        type: object
        properties:
          month:
            type: string
          total_spending:
            type: number
          transaction_count:
            type: number

  spending_by_merchant:
    description: Get spending grouped by merchant
    readonly: true
    params:
      months:
        type: number
        default: 3
        description: Number of months to analyze
      limit:
        type: number
        default: 25
        description: Maximum merchants to return

  spending_by_category:
    description: Get spending grouped by category
    readonly: true
    params:
      months:
        type: number
        default: 3
        description: Number of months to analyze

  balances:
    description: Get current account balances
    readonly: true

  unreviewed:
    description: Get transactions that need review
    readonly: true
    params:
      limit:
        type: number
        default: 50
      days:
        type: number
        default: 30

  recategorize:
    description: Change the category of a transaction
    params:
      id:
        type: string
        required: true
        description: Transaction ID
      category_id:
        type: string
        required: true
        description: New category ID

  add_note:
    description: Add a note to a transaction
    params:
      id:
        type: string
        required: true
      note:
        type: string
        required: true

  hide:
    description: Hide a transaction from reports
    params:
      id:
        type: string
        required: true

  unhide:
    description: Unhide a transaction
    params:
      id:
        type: string
        required: true

  mark_reviewed:
    description: Mark a transaction as reviewed
    params:
      id:
        type: string
        required: true

instructions: |
  The Finance tool manages personal finances. Use it to:
  - View and search transactions
  - Analyze spending by month, merchant, or category
  - Review and categorize transactions
  - Check account balances
  
  Always check `unreviewed` transactions periodically to help users categorize new expenses.
---

# Finance

Unified interface for personal finance management across different finance apps.

## Providers

- **copilot** - Copilot Money (macOS)
