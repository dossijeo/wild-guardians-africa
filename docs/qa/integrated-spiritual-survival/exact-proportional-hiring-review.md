# Exact proportional hiring settlement

The original 30/40 wages and 250/300-second shifts are unchanged. Floating-point subtraction in `30 * (1 - 100/300)` produced 20.000000000000004, which rounded up to 21. At time 200 it similarly charged 11 instead of 10.

Hiring now converts the actual persisted decimal time to an exact rational, adds each profile's proportional charge and rounds the aggregate upward once. It does not quantize the clock, round each worker independently, or grant a free contract at shift end. Unrepresentable Number quotes fail explicitly before payment.

Validation: 26 tests pass, including every integer time in every profile's shift with 1/2/7 workers, mixed bills, decimal times on either side of an integer charge, native additional hiring, ledger debits and save/reload idempotency. Workforce allocation, existing hiring and delivered-income auditing regressions also pass. Vite build succeeds in 11.93 seconds; its existing large-chunk advisory remains.

Historical campaign snapshots, receipts, ledgers and frozen audits are retained unchanged. This is a correction for future settlements, not retrospective repricing. A worker-throughput audit which recomputes historical quotes must use the matching frozen workforce source; a new pricing implementation cannot be used to declare an older recorded charge corrupt.

This does not establish 100-night balance, GPU performance or human-player inactivity acceptance. The change remains on the integrated experimental branch.
