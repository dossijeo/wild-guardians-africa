# Experimental shared raid-preparation Worker

This candidate remains OFF. It is based on `16d65f3e`, not an implementation port to current main. Main `fdb91dd5` was inspected read-only: its plain entry protocol differs from this historical candidate. No App activation, new Worker, RAF, campaign, CI, GPU or calendar change was made. Centre800, wages30/40, prices, damage, target reservations, actor radii, FIFO and simulation sources are unchanged.

## Ownership and scheduling

The existing `RaidEntryPreparer` Worker optionally receives both entry and exterior-geometry jobs. `SharedRaidPreparationWorker` keeps one active job and at most one queued job of each kind. Entries have priority, with at most two consecutive entries before queued geometry. An already running synchronous Worker computation cannot be preempted; cancellation suppresses adoption without terminating the other channel. Replies require matching job, owner and kind, finite bounded payloads and private origin evidence. Old owned replies are ignored; malformed/current unowned replies fail closed. Disposal terminates the shared Worker once.

The worker caches at most two complete geometry graphs. Entry computation adopts a graph only through its matching geometry key and existing finite ownership validation. Geometry failure switches to the real cooperative iterator; worker failure notifies both channels. Partial, stale, cancelled or disposed graphs never install. Existing deadline behavior stays intact: unavailable or late preparation can still reach the original cold synchronous fallback. This remains a blocker, not a silently deferred or skipped raid.

`WorldScene.load(...,{raidExteriorPrewarming:false})` remains the default. Only the opt-in scene connects the shared transport to its existing render-cycle prewarmer. No second render loop or Worker was introduced.

## Original negative and supplementary proofs

`original/negative-first.tap` preserves the first actual Node-thread test: **1 PASS / 1 FAIL**. The assertion compared the entire returned reply, including warmth. Geometry reuse skips props enumeration in the entry request navigator, so the packet contains four chunk records rather than the reference's last eight, in different order. That exact reply-byte/object equality remains false. The original test source is retained. The early complete runtime manifest and separate full reply objects were not retained; the TAP retains its expected/actual difference. No retrospective claim fills that gap.

Final tests add different, explicit assertions: exact geometry/key/proof/entry, exact walk/segment/path arrays, every returned chunk canonical against fresh native navigation, and actual adoption through `warmRaidNavigation`. They do not turn the negative equality into a pass.

Advanced actual chunk order: `-1,2; 0,2; -1,1; 0,1` (14,842 UTF8 JSON bytes). Reference order: `-1,0; 0,0; -2,1; -1,1; 0,1; -2,2; -1,2; 0,2` (26,484 bytes). The four omitted chunks were subsequently queried on host navigators with actual/reference warmth installed. Payloads matched native canonical chunks. Candidate cold queries took **0.190–6.428 ms**, versus **0.0007–0.0078 ms** with those chunks already warm. Reduced warmth can shift work to the host; this fixture does not bound all host cache misses or deadlines.

## CPU evidence

Four final commands passed **30/30**: protocol/frame12, actual Node2, original preparer15, native physical1. Exact commands, original TAP bytes and hashes are in `receipt.json`. `python tools/verify_shared_raid_worker.py` checks source hashes, payload integrity and the reported scope without mutating inputs or producing a self-hashed output.

Three sequential real Node-thread runs use the retained advanced state (103 walls/865 living plants, original day21/nightPlan null) and five canonical radii. Each has exactly one actual thread and two jobs. The QA adapter imports the actual worker dispatcher/compute path. Its private event capability comes only from the real Node thread listener. It is **not** proof of browser `MessageEvent` ownership or WebWorker rendering. Production does not install that QA capability.

| CPU layer | Three observed runs |
|---|---:|
| Main initial controller call | 6.439–8.541 ms |
| Main graph adoption call | 2.170–4.147 ms |
| Main JSON packing totals | 6.476–7.055 ms |
| Main synchronous postMessage totals | 1.641–1.700 ms |
| Worker geometry computation | 737.278–990.103 ms |
| Worker entry computation, graph reused | 268.424–366.682 ms |
| Entry waiting behind geometry | **751.141–1003.167 ms** |
| Overall request/reply elapsed | 1037.464–1387.977 ms |

No main geometry iterator steps/builds occurred; one complete graph was adopted per run. Two request JSON proxies total340,451 bytes and two reply proxies total699,381 bytes. These are UTF8 JSON proxies, **not actual structured-clone transfer bytes**. Packing excludes encoder work; timings overlap/nest and must not be added together. Recorded RSS points cover the whole Node process including its thread, not isolated graph memory or peak RAM.

The preserved previous0085 controller advanced run had821 preparing calls,1329.07 ms total controller time and34.409 ms maximum call, with a cold `propsAt→chunk→scatterWorld` operation. These are different CPU observations, not randomized ABBA, total-load improvement or GPU/frame acceptance. Moving geometry removes its main iterator work in this fixture but does **not** automatically satisfy entry deadlines: the concrete queue delay above remains unacceptable as an unreviewed production guarantee.

## Native physical scope

The final physical test uses paid walls/gate and a planted native Sabana/Saheliana712 enclosure, twelve mixed-species animals, original preparer baseline and one actual shared Node Worker. Both spawn snapshots/RNG match, every ordinary0.25-second tick matches full serialization, and both save/reload after the fourth tick. All twelve animals reach their real exits; ledger stays unchanged. Forty-one retained route samples end with no raid. Initial SHA256 `20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376`; final `7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416`.

This is bounded physical parity, not a six-biome matrix or risk/balance acceptance. Remaining gates include browser ownership/render QA, main-thread packing/adoption under actual frames, moving/editing farms in real rendering, cold fallback and entry deadline/fairness across workloads, total/peak resource comparisons and current-main integration review. No net performance, production-readiness or100-night acceptance is claimed.
