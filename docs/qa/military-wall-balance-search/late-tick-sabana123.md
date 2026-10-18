# Sabana/123 V1: late `Game.tick` investigation

This investigation uses the original V1 pressure recipe and the unchanged
topological virtual-player policy. It is performance QA, not a balance change.
The reference is the authentic 100-night run in
`current-main-pr108-v1-original-sabana123-100.json.gz`: day 83 spent 72.32 s
inside `Game.tick`, followed by 80.11 s on day 87 and 119.23 s on day 90.

## Reproduction and frozen states

An 83-night replay from the same opening matched **all 83 nightly serialized
state hashes** of the 100-night run. Its day-83 `Game.tick` time was 72.53 s.
The replay report records source `2f9d1e90`, candidate V1, input hashes and
nightly hashes in the ignored local file
`test-results/v1-original-sabana123-pr108-day83-profile.json`. The two
diagnostic saves are also ignored, because they are large generated files:

| Save | Time | SHA-256 of file |
| --- | ---: | --- |
| `...-day83-time250-state.json` | 250 s | `a31577e53cf333492916e748d35495b4bd7dc494c73e4824fd14b64ee548abbf` |
| `...-day83-raid-state.json` | 380 s | `360954b58aeee650e2b4eeba22ca3bbc96dd678e4e15ea39b2d49710bfd3a519` |

The frozen replay tool accepts the experimental recipe with `--candidate` and
can approximate the campaign's initial 3×3 resident chunks with
`--campaign-residency`. These are **partial replays**, not a substitute for
the continuous campaign: restoring a save resets native-derived state and
does not reproduce subsequent economic decisions, spells, repairs or sector
residency history.

From the raid save, 120 simulated seconds took 1.311 s with full historical
plant/crate arrays and 1.304 s after removing inactive plants and delivered
crates before constructing the native projection. Both arms produced the same
hash of the active state. With campaign-style initial residency, the same
120-second slice took 2.721 s. Neither partial replay reproduced the
continuous-run day-83 spike. Thus these measurements do not prove that
historical objects are harmless in the full campaign, or identify the slow
subsystem.

The live day-83 profiler is enabled only with
`WILD_ENGINE_CPU_PROFILE_DAY=83` in
`tools/experiments/run-native-intent-campaign.mjs`. It writes a `.cpuprofile`
beside the report, starting after the first tick of that day and stopping at
its end. It does not change commands, economy or simulation state. Its
separate source/tooling commits are `633266ac` and `cbae52e8`; the profiler
run must still be checked for nightly hash equality before interpreting it.

The original report's day-83 deltas show only about 1.00 s of raid-target
selection, 1.01 s of native `planIfNeeded`, 0.84 s of `flushWorldEvents` and
less than 0.17 s in the other measured intent bridge phases.

## Live day-83 CPU profile

The profiling rerun matched **all 83 nightly serialized state hashes** of the
reference and used the same game, raid and WASM input hashes. Sampling raised
the measured day-83 `Game.tick` wall time to 112.62 s, so its timing is for
attribution, not an A/B speed claim. The complete
[compressed V8 profile](late-tick-sabana123-day83.cpuprofile.gz) can be
summarized with:

```sh
node tools/experiments/summarize-day-cpuprofile.mjs \
  docs/qa/military-wall-balance-search/late-tick-sabana123-day83.cpuprofile.gz
```

| Inclusive sampled path | Milliseconds |
| --- | ---: |
| Full profile | 120,720 |
| `Game.tick` | 112,355 |
| `planRepairAccess` | 102,160 |
| Native repair-access branch | 19,518 |
| Legacy `withWallStatePreview` repair fallback | 81,078 |
| Native route calculation within the above paths | 72,981 |
| Native barrier updates within the above paths | 8,707 |
| Garbage collector | 274 |

The rows are inclusive and overlap; they must not be added together.
The dominant path is `Game.tick` → worker repair completion →
`planRepairAccess` → legacy `checks()` → `withWallStatePreview` → native
route/sector work. This is evidence of repeated speculative wall-state
validation during repair, not of spell VFX or GC pauses. The profile does not
yet identify why `nativeRepairAccess()` returns `null` for the costly calls;
that branch has distinct causes (unknown residency, inconclusive worker
access, or no candidate gate). The next diagnostic must classify those
reasons before changing the repair safety contract.
