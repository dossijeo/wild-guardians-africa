# Runtime candidate preflight — no campaign acceptance

This work follows reviewed arithmetic commit `ba3caedb`, on isolated `codex/campaign-horde-proposal`. It changes production source **only in that branch**. No PR, main integration, campaign or GPU benchmark is authorized.

## Reviewed candidate, distinct from main and historical H

Centre800, initial1500, wages30/40 and crop seed prices are unchanged. Sales are baseline×3 (33/108/39/51/69/534/96/801), attraction remains explicit baseline11/36/13/17/23/178/32/267, and the running distance quota is4. Structure damage is **HALF of base main**:10/12.5/17.5/20/30, matching historical H damage. This supersedes the initial arithmetic proposal's full-main-damage choice after root review. The compatible control must use the same half damage; any later damage escalation requires a separate experiment. H600 evidence cannot validate these800-centre economics.

Canonical player revisions and generated balance contain the reviewed horde stages. The generator still rejects centre!=800 or older wage!=30 and young wages below30. New attraction/stage mappings are validated before writing output. No save format version is changed.

`compositions` accepts validated limits, defaults to original5/.75/species caps, preserves group ordering, freezes cached groups/results and bounds its cache to128 keys. Cache keys include costs, unlocks and caps; it stores no world/RNG/navigation state. `planNight` samples the native tier budget once and scales it only for configured nighttime stages. New plans persist `plannedNight` and their chosen group. Legacy plans lacking this field preserve their exact group and RNG on load; spawn does not recompute group from the later day. Daytime spawn/planning is untouched and still uses original limits/budget7–10.

The existing planning-only100nights test now checks the actual configured per-night cap rather than hardcoded5. It still demands an animal every night and exactly the first five species. It is **not** a100night simulation, ledger, inactivity or balance gate.

## Bounded CPU results

- Runtime+arithmetic unit tests:10/10 PASS,279.98 ms Node duration (cache eviction added afterward, separate log).
- Native first-five spawn/save and invalid crop damage save:2/2 selected PASS,229.46 ms;41 deliberately skipped.
- Default30-seed/night planning, physical fractional-HP repair, decimal repair ratio and exact FIFO/deduplication:5/5 selected PASS,324.88 ms;52 skipped.
- Actual native Sabana12-body mixed entry, stale prepared-group rejection and impossible footprint bounds:3/3 PASS,1071.45 ms. No navigation method or terrain profile was replaced by fake walkability.
- Cache eviction directed test:1PASS,170.05 ms;5 skipped. Generator audio-price guard:4/4PASS,688.17 ms; generated balance `--check` PASS.
- Two physical crop hits/reload across all five species plus active-raid dawn deferral, final-raid defeat precedence and victory/postgame:8 selected PASS,290.93 ms;58 skipped. No full campaign was executed.

The initial entry fixture omitted active bounds, causing `bounds is not iterable` and no prepared request. Its original failed log is retained; the corrected fixture derives bounds from the real camera active region. The initial unit run referenced nonexistent `day_threat_min/max` fields (9PASS/1FAIL); corrected assertions use the actual `[7,10]` array. These were fixture errors, not hidden changes to game outcomes.

Native root Canyon/Mapungubwe/seed712 entry preflight is separate evidence at main `.cache/root-horde-entry-preflight/canyon12.json`:12 bodies, legal entries/exits and separation, no serialized-state mutation. Root measured74.286 ms for that single CPU entry query. Neither that measurement nor the Sabana test proves runtime frame fluency, arbitrary mixed distributions, worker-compute readiness or all-biome coverage.

## Blocking entry-retry design: review before implementation

No retry code was improvised. Current `Game.tick` marks a night plan done before `spawnRaid`, which consumes a preferred-side RNG draw before finding entry. Failure shows a notice and skips the group. A larger count could worsen that failure; this branch cannot be considered ready for campaigns or production until the semantics are reviewed and tested.

Proposed minimal contract:

1. Return an explicit `spawned / unavailable / ineligible` outcome from nighttime spawn, without treating unavailable as a completed planned night.
2. On the first attempt, choose/persist the preferred side once. On retries, reuse the selected group and side; never reroll composition or strike budgets. Do not allocate actor IDs or emit `RaidSpawned` until a complete legal entry exists.
3. Worker request/key must include that persisted side. Today its key includes current RNG and its computation predicts the next side draw, so adding retries only in `Game.tick` would invalidate or misinterpret preparation. Update worker/key/camera geometry invalidation together, maintaining default first-attempt parity.
4. Attempt again only after entry-relevant camera/bounds/geometry changes or a fresh prepared result; do not rerun costly searches every tick. Preserve bounded native near-camera/near-farm/boundary fallback and validate the whole group. Never omit an animal, teleport through terrain or inject artificial walkability.
5. An unavailable group at dawn must not be silently discarded. Delaying dawn while a planned but unspawned raid remains is a gameplay/clock semantic change, unlike the already defined active-raid deferral. It needs an explicit reviewed resolution contract, visible diagnostic and cancellation/error behavior rather than an infinite night or fake victory. This decision is unresolved here.
6. Persist any retry metadata and test mid-pending save/restore, entry changes, prepared replies, no valid entry, night100 and loss-before-victory. Default old plans still preserve their original group/RNG.

This touches simulation boundary processing, prepared-worker protocol and save metadata. Delivering this specification for review is safer than changing those contracts speculatively. The new separate defense-neglect comparison remains documentary; the original producers/repair loops are untouched. No paired campaigns, matrix30 or globalactivity claim was run.
