# Root review of isolated horde-entry candidate

Reviewed candidate `ad0cdb3a` on `codex/campaign-horde-proposal`. This is evidence review only; its runtime changes are not integrated into main and no campaign acceptance follows from this report.

Root independently inspected the native work-budget wrapper, connected packing, compute/preparation handoff and tests. The wrapper counts actual geometry calls and native search yields, restores method descriptors, closes interrupted iterators and throws through native path calculation before returning an exhausted result. Cached/prepared routes need no search allowance. Packing retains species-specific radii, pair clearance and reversible terrain/escape checks rather than reducing bodies to obtain a placement.

Root ran `node --test tests/raid-entry-budget.test.js tests/horde-desert-prepared.test.js`: 5/5 PASS, exit 0, suite 2718.3107 ms. The Desert test took 2476.7078 ms. These are CPU test durations, not frame-time, GPU or loading benchmarks. The test checks preparation/receive/spawn, actual native attack approaches, reversible exit segments, RNG and disposal; it does not simulate the complete physical attack and retreat.

The tested working copy already contained an uncommitted extension of the Desert test selecting `HORDE_PREFLIGHT_BIOME`, defaulting to `desierto`. Its only diff changed the biome input and test name. This result therefore belongs to that live default-Desert fixture, not a byte-identical copy of the committed test. The original receipt remains unchanged. Observer cherry-pick `7f45a71c` was also present; no campaign producer was launched.

The first independent SHA256 verification stopped at that changed test, as expected. A subsequent verification explicitly excluded only `tests/horde-desert-prepared.test.js` and verified all 50 remaining source/evidence hashes against `packing-source-receipt.json`, including every runtime module and preserved negative payload. No hashes were rewritten to hide the extension.

Open acceptance: other-biome evidence review, worker-disabled cooperative progress, real worker transport in a campaign producer, physical traversal/attack/retreat completion, cold/warm frame stability, target reservations and unused hit budgets. Economic survival, paid defense/repair efficacy, meaningful neglect losses and the full biome/culture matrix remain unproven. A twelve-body spawn is not twelve simultaneous attackers.
