# Expansive712 day5 rejected exterior entry

The original pilot on main43bb06b7 was incomplete with `Completed preparation has no valid whole-group entry; case incomplete`. It is preserved in `../native-economic-balance/pilot-43bb06b7-expansive-712/`, and copied original state/source/receipt files here are byte-identical. It remains an incomplete original observation, not a defeat or a successful rerun. Snapshot SHA256 after decompression: `73ab7c612edd17bd32dcc6cc9a4e2bfd5ac6aa83da4a8d63191b2871add3a550`.

Frozen state: Sabana/Mapungubwe seed712, day5,time600,completed4, one introductory rhino pending. The native footprint radius is1.55. The prepared selector returns null before any birth; this is geometry certificate rejection, not renderer residency.

## Geometric cause and correction

The old filter demanded independent straight exterior rays from both birth and exit. In the real procedural scene, a candidate birth at(85.2139509055,20.5538558888) has a native16-ray exterior witness. Its exit at(85.5352363121,23.5366022219), exactly3m away, has no independent ray at those discrete angles. Both positions are fully walkable and the full-radius native swept segment exit→birth is clear. Requiring two independent direct rays rejected a valid two-segment exterior connection.

The candidate accepts either the previous independent exit ray or a native clear exit→birth segment connected to the birth's already-proven exterior ray. No new A*, wider collider, fluid exception, teleported actor, altered group or extra RNG draw is introduced. The new branch adds at most one native segment query per evaluated actor/candidate and retains the existing bounded16 projection directions. It does not make16 rays a complete enclosure classifier: legal bend-only birth routes may still be rejected and must remain incomplete evidence for later investigation.

`rhino-entry-negative.jsonl` preserves the pre-change diagnostic candidate=null and candidate ray/leg facts. `rhino-entry-candidate.jsonl` records the corresponding post-change geometric selection. The one changed topology assertion no longer demands an independent exit ray; it requires the full connected certificate and additionally checks exit walkability explicitly. Its pre-update98/99 failure trace is retained in `independent-exit-contract-before-update.tap`; no physical failure is inferred from that old direct-ray-only contract.

## Native acceptance scope

`native-candidate.json` is a separate bounded replay from the exact original snapshot. Normal Game.tick resolves the rhino raid and completes night5 in19.1 simulated seconds for dt0.1,dt1 and save/reload after5s. Completed nights advance4→5, raid becomes null, result remains null; a native StructureHit is recorded. Static full-radius walkability checks pass in190/19/190 observed actor positions. These endpoint checks do not externally prove every internal swept leg: native motion clearance remains authoritative. No campaign/pilot restart or renderer/GPU measurement was performed.

Negatives isolate the proposed pair after real navigation invalidation: fluid, slope0.8 and a newly added solid wall reject the native connecting segment and the shared certificate. The tests do not substitute another pair to conceal those failures. The existing closed/open/gate/concave/separate, six-biome, whole32/72 cohorts, RNG/save, async residency and camera-entry contracts are retained.

Reproduce with:

```text
node tools/probe-rejected-exterior-entry.mjs
node --test tests/raid-entry-shared-certificate.test.js tests/raid-exterior-entry.test.js tests/raid-entry-residency.test.js tests/raid-entry-preparer.test.js tests/raid-camera-entry.test.js tests/raid-camera-terrain.test.js tests/raid-active-border.test.js
```

The candidate is based on main16f9f0b6, whose differences after the frozen pilot source concern QA policy/evidence. This fix changes only group exterior certification; no economic calibration, cohort composition, hit budgets, gameplay time or save format changes are included.

Validation terminal:99/99 focused contracts pass (108.41s functional run), the separately added exact real preparation-engine contract passes (one executed, seven filtered), and5/5 SFX/capacity contracts pass. Production build passes in17.65s with existing import/bundle warnings. These durations are verification observations, not isolated frame-time or GPU measurements. All original pilot files remain untouched. The real preparation engine returns a whole rhino entry with legal birth/exit positions and leaves the original state/RNG unchanged.
