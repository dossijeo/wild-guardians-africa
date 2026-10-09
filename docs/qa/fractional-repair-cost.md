# Fractional structure health and repair settlement

Repair calculation previously passed `maxHp-hp` directly to BigInt. Non-integer health throws, including legitimate proportional gate health and candidate fractional structure damage. This change is independent of whether an economic candidate is promoted.

Convert persisted finite Number values using their decimal representation (including scientific notation), subtract HP as rationals and compute the proportional repair cost without a fixed precision or half-HP assumption. Integer costs and ruined reconstruction remain unchanged. The existing ledger still rounds upward to whole coins only when charging; no save schema or raid damage is changed.

Validation: `node --test tests/money-decimal.test.js tests/acceptance-repair-chains.test.js` — 11/11 pass. A native Game/Navigation fixture restores a serialized wall at 287.5/300 HP, orders repair, waits for the real worker journey and verifies a single two-coin debit for 35/24 cost. Existing interruption, destruction/reconstruction, replay, increased damage and insufficient-funds chains pass. Decimal gate health 179.73/180 produces 21/400 before settlement; original integer examples remain exact. Number conversion covers signs, zero, exponent forms and non-finite rejection.

`npm run build` passed in 8.74 seconds with existing chunk-size/dynamic-import warnings. `git diff --check` passed. These checks do not constitute rendered or physical-device acceptance, campaign balance acceptance, or approval of new animal damage parameters.

## Remaining-value refunds

Wall refunds used a separate micro-HP rounding step. A restored gate with positive 1e-7 HP reproduced a zero refund before the correction, despite a positive proportional remaining value. Refunds now use the same decimal rational conversion, retain the existing zero/ruined/collapsing exclusions and cap health at maximum before rounding the final positive amount upward. Removal replay still cannot credit twice. No health, cost or damage parameters change.

The repair, money, wall gesture/budget and refund audio suites pass 26/26, followed by the refreshed 126-SFX source audit tests (3/3). The updated inventory only changes source hashes and line references; audible acceptance is still separate.
