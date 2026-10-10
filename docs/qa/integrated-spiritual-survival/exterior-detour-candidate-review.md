# Bounded positive exterior detour candidate

## Problem and resulting behavior

The retained protected seed-2026 campaign stopped at night 10 because all fast
exterior certificates rejected its spawn positions. The read-only investigation
proved a real bend-only exterior route at the largest pending animal radius.

The existing fast selection runs unchanged first. Only after all its candidates
fail, preparation tests at most four exterior detours from a body-valid native
camera candidate for the largest animal. Every route point and segment passes
native animal collision checks. Smaller animals can connect to this route only
through their own checked body-radius segments. The certificate is local to the
preparation and explicitly invalidates on navigation epoch change.

Preparation first tries the existing camera formation with this additional
positive certificate. If the immediate camera patch cannot hold the complete
group, it selects separated positions along the same verified exterior route,
with clear retreat segments and corresponding sparse residency bounds. It
never thins or rerolls a pending group and never accepts an unverified exterior
connection. Rare crowded cases can therefore spread farther from the camera.

This changes entry selection only. Prices, plant health, military pressure,
composition, budgets, attack damage, magic and strategy decisions are unchanged.

## Native retained-incursion replay

`tools/probe-native-entry-recovery.mjs` uses the real Node preparation worker,
production readiness handshake and native game ticks on a copy of the retained
snapshot. No strategy interventions, magic, damage, funds or clock overrides
are introduced. The original partial campaign remains incomplete and preserved.

| Fact | Before correction | Corrected retained replay |
| --- | ---: | ---: |
| Complete pending group | 0 actors admitted | All 16 admitted |
| Completed raid | No | Yes |
| Assigned/consumed native strikes | Not spawned | 67 / 67 |
| Wall impacts | Not spawned | 54 |
| Center impacts | Not spawned | 0 |
| Crops destroyed | Not spawned | 19 of 233 |
| Final living crops | 233 at blocked entry | 214 |
| Day reached | 10, blocked at dawn | 11, mandatory hiring |
| Native defeat | No | No |

The raid completes after 62.1 simulated seconds. Native evidence coverage is
verified, and every actor retires with zero remaining strikes. Three replays
have identical actor facts, final-state summaries and incursion evidence.
Versions 2 and 3 include source hashes; version 3 includes final epoch protection.

Local cold worker readiness measured 6.16, 6.89 and 7.28 seconds across the three
replays (some runs overlapped checks/build). These are preparation wall times,
not frame times or GPU results. The work executes in the existing preparation
worker. No performance improvement is claimed. Preparation should start before
entry; synchronous fallback latency remains a limitation worth monitoring.

## Checks and continuation

- Eight focused checks pass: actual retained group, determinism, spacing,
  complete-group rejection, body radii, segment validity, epoch invalidation,
  closed walls and mixed cliff/wall enclosures.
- The first combined entry/evidence regression passes 57 checks, and expanded
  preparation/residency/wave/canyon/reservation/reload/retreat regression passes
  105 checks. Final focused checks were rerun after the epoch guard addition.
- Web production build passes, including the preparation worker.
- Original snapshot hash is unchanged in each replay.

The correction is confined to the experimental integration branch. It is not
100-night or visual/GPU acceptance. Fresh fourteen-night pilots must now use the
frozen source and the v6 productive-control policy that allows paid center
repairs without adding walls to no-wall scenarios. Historical campaigns remain
separate because their policies and source hashes differ.
