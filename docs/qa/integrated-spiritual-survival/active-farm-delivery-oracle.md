# Legacy active-farm delivery oracle

The long `tests/active-farm.test.js` campaign retained an obsolete assertion that a delivered crate's ledger entry equals only the rounded base value. Shared agricultural power now carries a distinct committed entitlement and settles `multiplyIncome` only upon physical delivery. The existing intensive-farm verifier already accounts for this separation.

The legacy campaign test now checks the exact rounded sum of base crate value and settled whole-coin Multiply income. A positive bonus requires both its original commitment and completed settlement. Undelivered crates still must have no delivery ledger entry. This updates a test oracle only; no strategy, price, productivity, spell power or runtime arithmetic changed.

Twenty native agricultural power and Multiply persistence checks pass, covering physical harvest/delivery, active/expired/carrying reloads, fractional settlement, repeated touches, rollover and budget limits.

The two prior full-suite legacy campaign defeats remain negative evidence. Their required night-100 victory assertions remain unchanged, and the later delivery assertion does not explain or repair those defeats. No new full legacy 100-night campaign was launched for this oracle update, while the reviewed frozen-profile comparison and existing scarce-magic controls are running. Do not report the full suite green on the basis of these twenty focused checks.
