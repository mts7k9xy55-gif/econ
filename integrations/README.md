# Unified Bank + Securities (one / econ)

Read-only unified model for banking and brokerage accounts. No settlement, trading, or banking credentials.

## Live UI
https://universal-money.yi525tokyo.workers.dev/

The deployed dashboard supports bank-statement CSV / brokerage-holdings CSV imports, per-account state, idempotent transaction aggregation, and export to econ's `EconEvent` envelope. Sensitive financial data is processed within the user's browser, not sent to the econ Worker. A separate legacy wallet UI remains at `/wallet`.

## Model
- `accounts` are current financial account valuation snapshots, one per account. A securities account's valuation includes its positions.
- `positions` are *details* of the brokerage snapshot. **Do not add position market values again** when totalling account balances.
- `transactions` are events, not snapshots. Reimports with identical source IDs are deduplicated; conflicting IDs are rejected.
- Currencies remain separate. The adapter deliberately does not pretend USD and JPY can be added without verified exchange rates and timestamps.
- Only transaction events are exported to econ. A securities-market price increase is **not** cash revenue.

## Moneytree LINK connection boundary
Moneytree LINK supports both personal bank accounts and investment accounts. The relevant read scopes are `accounts_read`, `transactions_read`, `investment_accounts_read`, `investment_transactions_read`, and `request_refresh`.

Moneytree requires a contract, issued client credentials, an approved redirect URI, and the user's OAuth consent. Do **not** insert client secrets into browser code or provide password-scraping as a fallback. The `moneytreeReadPaths` helper is a read-only endpoint map, not an operational OAuth connector.

Official sources:
- https://docs.link.getmoneytree.com/docs/getting-started
- https://docs.link.getmoneytree.com/docs/api-scopes
- https://docs.link.getmoneytree.com/reference/get-link-accounts
- https://docs.link.getmoneytree.com/reference/get-link-investments-accounts-positions

## Integration discipline
Do not POST private account data to econ's public `/event` endpoint until proper user authentication, authorization, server-side consent checks, credential storage, and access control are established. This PR is intentionally additive. Existing econ's financial transaction executor and databases are unchanged.

## Tests
`npm test` should include `tests/financial-state.test.ts`.
