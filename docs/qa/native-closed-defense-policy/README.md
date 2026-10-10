# Opt-in native complete-contour defense candidate

Base `9124b118`, branch `codex/native-closed-defense-policy`. QA tools/tests only; no gameplay, economic/pressure parameter, old policy, runner or strategy selection changes. Root's newer Q6 staffing and target-reservation work are not silently imported. No campaign/CI/GPU/production acceptance.

## Policy

`createNativeClosedDefensePolicy` starts on day 1, instead of the unchanged expanding policy's day 2. The caller explicitly opts in and supplies protected cash and ordinary command IDs. It protects that cash (at least native hiring reserve 100) plus the actual pending/requestable repair costs. Caller responsibility remains protecting today's/tomorrow's intended wages and other maintenance; this helper does not invent wages or affordability. All prices, placement, automatic gates, purchases and repair requests use production Game APIs.

Each attempt tries at most nine deterministic enclosing rectangles: native module-grid bounds around living crops and operational centre footprints plus 3 m margin, expanded 0/1/2 module widths independently per axis. Previous accepted bounds are retained, so expansion never deletes or relocates old defenses. The selected material applies only to new modules; existing matching mixed-material modules remain unchanged. A conservative perimeter bound is checked before resampling, with at most 256 slots. There is no unbounded reroll or obstacle clearing.

It requires all missing slots to appear in the native preview and the entire new stroke to fit the protected budget. It rejects any new native prop suppression, crop overlap or omitted pieces rather than moving crops/props or paying for a broken fragment. Existing ruined/collapsing occupancy still prevents duplicate new pieces in `wallStroke`, but is explicitly rejected as a physical barrier. Native repair commands preserve FIFO; neither requests nor reserved funds are reported as completed/paid repairs. No repairs are made magically. A complete preview with no new modules generates no charge.

The helper returns geometric *complete legal slot coverage*, not a universal protection certificate. Tests and the separate physical preflight provide actual sampled navigation evidence. It deliberately does not run many A* searches inside every construction decision or claim that piece count alone proves protection. Rechecking a contour and native previews/gate planning can still be expensive; this is an offline opt-in QA player policy, not an approved render-frame feature.

## Evidence and commands

```
node --test tests/native-closed-defense-policy.test.js tests/native-expanding-defense-policy.test.js
node tools/probe-native-closed-defense.mjs NEW_OUTPUT_DIRECTORY
node tools/audit_native_closed_defense.mjs
```

Final directed suites: 9/9 PASS in 2642.3041 ms (seven candidate and two unchanged legacy policy tests). Final physical preflight exited 0 with full initial/paid/final states and all sampled movement retained in `physical-final/physical.json`.

Legal first-day physical fixture, seed 712 / Sabana / Mapungubwe:

- 1500 initial coins, centre 800, actual seed 5, actual older-female wage 30, complete defense 300; balance 365.
- No crop/prop relocation or defense suppression; time/elapsed unchanged by the purchase.
- Five fixed-endpoint native animal paths, using the actual species footprint radii, return no route into the enclosure. Both endpoints are natively walkable for every species. This establishes those path queries, not every possible world-scale route.
- Native gate portal is transitable for the worker radius .28 and blocked for animal radius 1.1.
- A real spawned facóquero starts outside and advances under ordinary `Game.tick`, with every sampled swept segment passing native collision. After 128 ticks (12.8 simulated seconds) it produces a `StructureHit` on an actual paid wall and zero `CropHit`. No actor teleport, clock reset, damage/profile override or forced hit is used. This is one physical fixture, not military balance or horde validation.
- Local CPU observations: policy 110.0991 ms, first path 240.7563 ms. Remaining per-species path timings are recorded separately. These are descriptive CPU costs, not frame-time or net-performance acceptance.

An additional legal crop at centre+(6,9) forces candidate 1 to reject prop suppression and candidate 2 to reject native omitted slots. Candidate 3 enlarges the rectangle by one module in Z and is actually paid, retaining crop coordinates, suppressed prop IDs and the protected budget. This is successful bounded avoidance, not reduced collision restrictions.

Negative retained: native Gran Cañón opening requires omissions in all nine searched contours (7–16 omitted slots). No walls are purchased and its original state/ledger remain exact. A closed rectangle spanning that terrain is therefore **not established** by this candidate. It does not synthesize natural boundary edges or count cliffs as fabricated wall modules. A separate native combined-boundary policy would need evidence before B is adopted in Canyon. Lack of money, >256 modules, damaged occupancy or no legal searched contour is reported explicitly, with no promise of all-farm protection.

`physical-01` and `physical-02` preserve earlier narrower positive preflights; only `physical-final` includes five-species paths and successful bounded expansion together. `policy-tests-01.tap` preserves the first fixture failure: JSON reload normalizes negative zero yaw, so direct deep-object equality was inappropriate. The corrected test asserts exact serialized roundtrip; gameplay was not changed. `policy-tests-02.tap` preserves the earlier six-case positive suite.

The receipt hashes all production source/config inputs and retained outputs. It verifies production source plus the previous expanding policy byte-identical to base. Neither older 77cf open-ring negatives nor Q5/Q6 economic results are relabeled. A campaign could still lose, run out of funds or place later crops outside the current ring; current money, repair arrival, actual interception and global inactivity must be measured after explicit adoption, not inferred here.
