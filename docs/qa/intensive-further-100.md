# Further recorded hundred-night completions

Two more cases in the bounded parallel matrix completed all hundred nights.
Their original process records both have exit code 0. The complete snapshots
were deserialized and audited again against integer ledger conservation, physical
pickups/deliveries, mandatory waters, victory and hundred completed nights.
Every workday contains contracted labour and at least one physical delivery.

| Case | Final coins | Peak live plants | Planted | Delivered crates | Destroyed | Daylight without actions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sabana/Suajili | 8360 | 795 | 13295 | 12170 | 352 | 53.79% |
| Gran Río/Saheliana | 1255 | 288 | 11349 | 10806 | 349 | 60.99% |

Both cases planted all eight crop species. This does not imply profitable
harvests of every species. Their per-species losses, actual cashflow and idle
reasons are retained in the summaries. These idle fractions still do not meet
the requested continuously busy farming experience.

Sabana/Suajili started at `dfbdb91` with the recorded strategy/tool modifications;
Gran Río/Saheliana started at clean `26bbc0d`. Each report retains actual input
hashes and startup provenance. Both have `sourceConsistent:false` against the
original matrix parent, which started earlier. Neither is relabelled as a test
of the current HEAD, and the full thirty-case matrix remains unverified.

`intensive-further-100/` contains original report, summary, status and process
records. Complete states are archived losslessly as gzip; `snapshots.json`
records exact decompressed SHA-256 and byte lengths (7,784,364 and 6,608,942).
The gzip copies reduce the Git payload to about one MB without discarding any
history. These campaign runs are domain checks, not physical mobile FPS, audio
or full acceptance evidence.

## Separate native browser storage check

The storage-capacity fixture loads the exact archived Suajili state, verifies
its SHA-256 and changes only the temporary slot identity. Production IndexedDB
saves two independent slots twice, retaining their full primary and backup.
Both reopen through fresh repository instances with exact serialization equality;
their backups also deserialize identically. After writing the second slot,
both are checked again for full equality, then only these QA slots are deleted.
No temporary keys/records remain. `two-large-indexed-slots.json` and its PNG
preserve the actual IAB result on `http://127.0.0.1:5181`. Each cloned state has
7,784,398 characters, 13,295 plants and 12,170 crates. This is a real browser
storage check, not a physical phone, Windows large-save or storage-limit proof.
