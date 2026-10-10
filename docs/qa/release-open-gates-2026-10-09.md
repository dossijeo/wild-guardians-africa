# Remaining integrated release gates — 9 October 2026

This is an incomplete-work register, not a release approval. The current-state
update below supersedes the historical checkpoint text that follows. Earlier
sources, failed candidates and measurements are retained, not silently changed
into current-main acceptance.

## Current-state checkpoint — 10 October, main e285d327

This checkpoint supersedes older live-run and unchanged-runtime descriptions
below. Main now includes the intact-centre repair navigation optimization
`e2d92c1e`; it retains caches only when the exact existing collision footprint
is unchanged. Walls and gates still follow their original rebuild path.
[The retained AB/BA diagnostic](center-repair-route-preservation.md) and
44 directed regressions support this bounded change. They do not approve
full-game GPU, mobile, Windows initialization or campaign balance.

Validate Game run38012364832 on e2d92c1e is terminal failure: 3790 of3792
checks passed. The two failures are obsolete generated SFX source hashes and
line references, corrected by main6faa09b0. All126 catalogue rows have identical
semantics and all3 local SFX checks pass; [the original log and receipt](ci-navigation-audit-2026-10-10/receipt.json)
are retained. Replacement run38013118033 is terminal success: all3792
tests, resource/source checks, build and direct itch package validation pass.
[Its original log and metadata](validate-main-38013118033/README.md) are retained.
This web CI result does not close Windows or campaign/physical QA gates.
Windows run38012364835 is terminal failure at90007ms/87% displayed, with
readyGateReached=false. Build and installer pass; world readiness remains open.
[The independently verified original artifact](windows-loading-regression/normal-e2-38012364835/review.md)
is retained. No changed90-second gate or exclusive bottleneck is inferred.
The later normal6faa run38013118055 also fails at90168.4ms/86% displayed,
with unchanged loading runtime; [its independently verified originals](windows-loading-regression/normal-6faa-38013118055/review.md)
are retained. Neither presentation snapshot isolates a bottleneck.

The distinct 212-worker day21 repair diagnostic paid174 at physical arrival
and restored centre HP470→600 at time235.25. It does not explain every
historical repair failure. A new paired20-night pilot on frozen e040ea6f uses
a self-consistent opening crew and the same six-plants-per-worker policy in
both arms. PID47872 is independently confirmed live; no partial campaign
acceptance, parameter promotion or100-night result is claimed. This frozen
pilot does not contain main's later centre-navigation optimization.

Loading crop partitions are still an isolated, unselected candidate. Frozen
0a416fd3 fixes nested CDN/Tauri URL resolution and independently validates
cropIndex/stage rather than relying on composite IDs. Root receipt verification
and31 directed lifecycle/hosting/serial-image tests pass. Node tests mock image
decoding; they do not prove native image rendering or loading-time improvement.
Later wiring/publication freeze4b110818 has root54 directed tests PASS in
two invocations and its receipt verifier passes. Exactly one isolated Windows
run38014169890 is live on that exact SHA, crop_partition=true, the other four
experimental options false and original gates/model preflight preserved.
[Root review](windows-loading-regression/maize-partition-root-review/README.md)
authorizes the trial, not promotion. The temporary40.85MB package duplication
must be eliminated before any eventual final integration. No production flag
is enabled and no native readiness or performance result is accepted yet.

## Current-state update through main 8e1909d8

### Superseding checkpoint — 10 October, main 4b217f39

The isolated serial-image-chain native trial
[38009458201](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38009458201)
on `93d584ef` is terminal failure at 90016.9 ms, 85%, world not ready.
Root independently downloaded and matched the official artifact and verified
[the retained original archive](windows-loading-regression/serial-image-chain-candidate/native-93d584ef/root-review.md).
Image scheduling was exercised, but no whole-loading benefit or native acceptance
is established. Build/installer pass; minimization is skipped. All candidate
options remain OFF in production. Next work is a read-only audit of crop resource
granularity, preserving complete world readiness and shared resource ownership.

The distinct legal day-21 repair continuation is terminal at daylight time 300,
after 299 further simulated seconds. The actual repair remains unassigned behind
417 FIFO tasks, from 1110 initially, with no observed raid, cancellation or repair
payment. All 106 paid workers reached shift end. Source and ledger audits plus
[independent terminal review](horde-defense-pilot-88ebf647-20/repair-continuation-a0c36ca7/root-review.md)
pass within this diagnostic's scope. It does not reconstruct fourteen historical
requests or approve the campaign. A separately named larger paid crew fixture is
being designed; no new campaign or balance change has been launched.

### Superseding checkpoint — 10 October, main edb586df

The single paired Canyon/Sahelian pilot on frozen `88ebf647` is terminal,
2266783.8539 ms. Both strategies completed 20 nights alive. Independently checked
raw and annotated payload hashes pass for both arms; this does not approve the
campaign. Responsible observed daylight inactivity is 32.15%, neglect 31.4667%,
both above the user's strict 25% limit. Neglect has not demonstrated a defeat.
Both have zero completed/paid repairs, despite responsible repair requests.
Native strike reconciliation and physical deliveries pass within this pilot's
scope; 100-night survival and the 30-combination matrix remain open.

The original responsible report incorrectly labels all 145 owned walls ruined:
its helper tests centre-only operational status. Native state instead contains
145 intact walls, including four gates. Original output must remain unchanged;
a separately identified diagnostic correction is required. No balance parameters
or production wall mechanics are approved by these results.

Root reviewed frozen loading candidate `93d584ef` and independently passed its
68 CPU contracts and receipt verifier. One isolated Windows trial is authorized
with the serial image chain enabled and all other candidate options disabled.
See [the wiring review](windows-loading-regression/serial-image-chain-wiring-root-review.md).
Native readiness remains unproven; the next trial must retain the original gates.

### Superseding checkpoint — 10 October, main c2538f7a

The isolated wall-package Windows run38007229019/source49ef2264 is terminal
failure, not live. Root independently downloaded official artifact11651569958:
45,898 bytes, SHA256
0079ad30b480161eda533a8a03bd9ed104e3946adbb96f1d73b214b35693cf8f,
matching the published artifact digest. Recipe records wallBufferPackage=true,
compileWindow=false and resourceOverlap=false. The unchanged90s gate ended
at90.2359s/85%, with walls completed,83 transfers/zero pending/zero failed,
25 chunks loaded and six hands adopted. Serial compilation had ten jobs
started/nine completed; world job10/batch6 of75 was pending program19.
Its91.9ms observed readiness age is not evidence of a stuck shader. This
failure neither establishes a total-loading speedup nor authorizes promotion.
EXE/installer build succeeded; subsequent visibility testing was skipped.
Original-report archiving is being finalized on the isolated branch. No retry
or combination of experimental flags is authorized. See the
[package and wiring review](windows-loading-regression/wall-buffer-package-root-review.md).

The earlier two-batch run38005088945 is also terminal failure, with compilation
never started. Its [original archive and review](windows-loading-regression/two-batch-window-candidate/native-24b76926/root-review.md)
supersede the historical live description below. Neither diagnostic changes
main's production loading recipe; runtime remains equivalent to8ab2381e.

After frozen repair/fixture review, exactly one paired20-night horde pilot is
now running on88ebf647 (Node51424 confirmed live by root). The responsible arm
has completed19 nights; neglect has not yet produced a result. Source/tests
remain immutable during the run. No partial economic/activity acceptance is
inferred. The [terminal review checklist](horde-defense-terminal-review-checklist.md)
distinguishes completed paid repairs from requests, and returned audit status
from actually passing gates. The hundred-night/thirty-combination scope
remains open.

### Superseding checkpoint — 10 October, main 5a3e9e74

Main source8ab2381e has terminal Validate Game success38001296018: all3785
tests, build and direct itch archive checks pass. Original complete logs and
byte verification are [archived](validate-main-38001296018/README.md). Later
main commits through5a3e9e74 only record evidence. This web success does not
accept Windows, current campaign balance, or unperformed physical QA.

The original normal Windows source9c753d32 and8ab2381e both fail the unchanged
90-second gate; their [9c archive](windows-loading-regression/normal-9c753d32-38000980557/review.md)
and [8ab archive](windows-loading-regression/normal-8ab-38001296015/review.md)
retain official reports. The isolated f92c6872 diagnostic also fails at85%,
with all25 chunks loaded, transfers idle and all six hand assets adopted.
Its [original timing evidence](windows-loading-regression/gltf-delivery-design/native-f92c6872/root-review.md)
does not establish an exclusive GPU, network or parsing cause.

Strict two-batch source24b76926 has root verifier and86/86 directed-test PASS.
Exactly one opt-in [Windows run38005088945](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38005088945)
is now live, with compile_window=true and resource_overlap=false. Original
serial behavior, assets, budgets and readiness gates remain. No performance
benefit, native success or promotion is inferred while it runs. See the
[bounded root review](windows-loading-regression/two-batch-window-root-review.md).

The single20-night horde comparison from frozen36a0e204 ended exit2/incomplete
after the responsible arm reached day20. Its strike reconciliation failed;
the runner then discarded the returned detailed state, retaining only the
error and progress. The neglect arm was not run. This is not campaign acceptance
or evidence of a particular mismatch quantity. Root found an audit omission:
native worker encounters also consume strike budgets and emit WorkerHit or
WorkerIncapacitated, which that equality excludes. Existing encounter tests
pass11/11. The isolated agent is authorized to preserve results before audit,
test failure-path persistence and correct event coverage without changing
gameplay, relaxing equality or rerunning the pilot before frozen review.
Original failures must remain preserved. Centre800, minimum wage30, actual paid
defence/repair evidence, FIFO/delivery and global daylight inactivity<25%
remain mandatory; the100-night/30-combination scope is still open.

### Superseding checkpoint — 10 October, main b539fb1b

The isolated resource-overlap run37998755565/sourcef7383473 is terminal
failure, not live. Root downloaded official artifact11648825862 independently:
all15,342 bytes match the archived raw, SHA256
df467799cba2bdc313ceb973cd2a613265145c2b421c4c72e95b352371d0d03b.
The [archive verifier and original report](windows-loading-regression/resource-overlap-candidate/native-f7383473/review.md)
pass preservation checks, not readiness. The unchanged90s gate ended at90%
with World compilation not yet started and nine chunks queued. This run does
not establish a causal shader, driver or download bottleneck; overlap remains
experimental and disabled in normal gameplay. No rerun has been authorized.
Further source/CPU attribution is assigned in the isolated branch before any
new native measurement.

Main20773112 pauses the actual sanctuary music while its SFX lab is open,
guards gesture/visibility restart and restores the music preference on exit.
Its first actual-native-starter test failed because two microtask flushes did
not settle the cross-VM promise chain. That commit was inadvertently pushed
before the failure was repaired. Main9a1bb1d3 corrects the test settlement;
root's current viewer/generation/i18n run passes24/24. The build and web package
passed on the runtime change, but this is not physical listening or mobile
layout acceptance. See [the exact scope and retained failure](library-sfx-menu-audio.md).

The horde cooperative fallback is still being validated in its isolated
branch. Agent-reported directed six-biome results have not yet been frozen
and independently reviewed by root. No responsible/neglect campaign is
accepted. The user's latest preference confirms keeping candidate economics,
testing more animals first and damage separately if needed, with paid defence
and repairs distinguishing responsible management from neglect. Centre800,
minimum wage30 and aggregate daylight inactivity strictly below25% remain
mandatory; all physical FIFO, delivery and reservation rules still apply.

### Superseding checkpoint — 10 October, main fd04cbcc

The previous subsection heading and investigations below are historical. Normal
main source4dc2efb1 has terminal [Validate Game success37997446294](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37997446294):
tests, build, web-package checks and itch packaging passed. Later main commits
throughfd04cbcc only archive evidence; this success is not mislabeled as a fresh
execution of those later heads.

The original early-preparation observation37995161569 is now terminal failure,
not running. Its [byte-preserved archive and verifier](windows-loading-regression/37995161569/review.md)
distinguish32.88s before active World work from nested asset/sky intervals; those
intervals are not additive CPU/GPU/network measurements. The original ordinary
main Windows run37997158813/sourceea5370cd also failed the unchanged90s gate at
displayed88%, with build/installers successful and native hiding skipped. Its
[original report and compressed job log](windows-loading-regression/37997158813/README.md)
are verified. Current Windows readiness remains open.

Isolated sourcef7383473 now has one authorized resource-overlap diagnostic,
[37998755565](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37998755565),
still live at this checkpoint. It overlaps presentation resource loads only;
normal gameplay selection is OFF, all shader variants/fences and90s readiness
remain. Root independently passed14 directed ownership/cancellation/scheduling
tests. No Windows readiness or performance improvement is inferred yet.

The horde branch has separately archived six native twelve-body physical
incursions at seed712/Mapungubwe, empty farms with one ordinarily paid centre.
Root independently audited72 exact physical exit endpoints, initial/final
snapshot hashes and12 total hits with270 unused strikes. This is narrow
navigation evidence, not the30-case farming matrix or proof of risk. Reservations
allowed one attacker per sole centre. Root's [prior source review](horde-entry-root-review-ad0.md)
remains explicitly bounded. The cooperative worker-disabled fallback is now
authorized for implementation in the isolated branch, but not yet accepted.
No paired campaign or production economic promotion has occurred; centre800,
minimum wage30 and daylight inactivity strictly below25% remain fixed.

The browser QA tool still fails initialization with os error3 on10October.
This current availability check supplies no rendered/interactive acceptance.
Pixel Wake Lock and the user's accepted camera traveling remain closed unless
new regression evidence appears. The full master-plan and later feature scope
remain uncompleted; the checkpoints below retain their original limits.

### Later bounded investigations and user balance constraints

The full-frame worker accessory pilot is now retained with its original native
reports and six captures in [the visual archive](workers-frontside/native-full-frame-490b/README.md).
The two day poses fit the actual terrain-protected camera and restore state,
animation and resource ownership exactly. This is one youngMale and one angle,
not all-worker/culture acceptance. Its separate original Windows CI failure at
82% remains preserved.

The unchanged prospective AB/BA GPU protocol then produced
[a negative useful-benefit result](workers-frontside/native-timing-negative-490b/README.md):
2,880 valid queries, 24 blocks, original9.3078ms versus candidate9.4743ms,
paired saving -0.1665ms (-1.789%), with the 95% interval wholly negative.
Root reran both archive verifiers. CPU recomputation's maximum floating-point
difference is1.776e-15ms, retained separately; the acceptance threshold and
negative conclusion are unchanged. Only five crate/hoe aliases were treated;
worker bodies already use FrontSide. This candidate is not promoted, and this
bounded endpoint does not justify expanding its repairs or repeating the test.

The next original Windows observation
[37990903561, source1cc3d0b7](windows-loading-regression/37990903561/review.md)
fails the original90s gate at85%. Root verified the exact official raw bytes.
The pending program maps to six V4 bridge Standard/object/resident associations,
batch6/78. Its observed1.4265s wait at timeout does not explain the entire
load. Transfers and chunk queues are idle; roughly29.9765s before the app-world
span remain unattributed. Nested spans are not additive. No shader recipe,
readiness requirement, driver flag or timeout change is promoted by this archive.

The user now fixes the work-centre price at800 and minimum wage at30 because
existing tutorial audio names both values. Historical H100 at600 remains
evidence, but is no longer eligible for integration or current balance acceptance.
Its22.7867% activity result must be remeasured on a compatible candidate.
Root also reproduced the six original H poor-policy terminal audits from
[the byte-preserved archive](economic-candidates-a518/h-bad6-terminal/README.md):
all six survived ten nights, so the loss gate failed even though accounting,
physical delivery and summaries passed. No defeat is inferred from low cash.
The user's preferred next risk comparison is progressive hordes against the
same productive policy with and without paid defences/repairs; it is not yet
executed or accepted. The earlier overhiring proposal remains a historical,
unexecuted plan and does not replace that comparison.

### Later Windows evidence and its limits

Normal main source `40a4b271` now has terminal Validate Game success, but its
[Windows run 37994484203](windows-loading-regression/37994484203/README.md)
failed the unchanged packaged-game readiness gate after90,159.9ms at displayed
84%. The executable and installer were generated; native hiding was skipped.
The official smoke artifact is preserved byte-for-byte. This report lacks
actual GPU identity and detailed early-phase attribution, so neither is inferred.
The already-running isolated observation37995161569/source07798700 remains
separate; there is no production loading change or duplicate diagnostic launch.

The exact packaged main executable from `2a910b83` now has local original-tester
PASS evidence for both New Game and Continue/native minimization. Its source,
artifact and executable hash are pinned in
[the original reports and receipts](windows-local-main-2a910b83/README.md).
The Continue report preserves all21 measured simulation fields over300,821.7ms
of genuine hiding and resumes with the menu pause retained correctly. Root
rechecked both gzip payloads against their original byte counts and hashes,
including the full hidden-state comparison. This is an archive recheck, not a
new runtime test.

The same executable's CI loading test failed. Local acceptance covers one
Gran Cañón/Mapungubwe configuration and environment; it neither establishes the
CI failure's cause nor approves every Windows device, biome or save. The
last fully green Windows workflow remains
[37922095376, source57527dc9](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37922095376).
The28.038s and343.500s local process lifetimes include preflight and, for Continue,
the required five-minute hidden test; they are not world-loading benchmarks.

Main `0c77365c` adds smoke-only presentation observations at report completion:
stage busy state, displayed progress/title, focus, visibility and canvas size.
World wait duration stops at the original stage-ready gate so the hidden test
is excluded; `66b47414` exercises that timing boundary. Five directed tests pass.
These fields do not establish GPU identity or make displayed progress a readiness
gate. Original90s readiness and300000ms native hiding requirements are unchanged.
The observation is now present in an actual normal-config native CI report:
[run37980008371, sourcefc66151f](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37980008371)
fails the unchanged readiness gate after90,136.2ms. Its [unaltered raw report](windows-loading-regression/normal-fc66151f/desktop-smoke.json) SHA256 is
`e9bf200eeb9cfa846610b1081c1c414c113ea2f0fa5f0003b392f56a002ab0b3`.
`checks.loadingAtFinish` records83% and `Preparing rendering resources`, with
the stage busy, readiness false and the window visible/focused at1028×720.
This narrows the presentation stage of the failure; it does not identify the
blocking operation or the actual GL adapter. Diagnostic loading options and
worker candidates remain unpromoted until
their actual native/visual/performance gates pass. The independently audited
[minimal water/lava coverage-depth extraction](painted-fluid-depth-production.md)
is now enabled in production source. Its exact-source web validation passes,
but the [normal Windows run37983985482](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37983985482)
fails readiness after90,034.9ms at88%, `Bringing your world to life...`.
The [raw report](windows-loading-regression/normal-8e1909d8/desktop-smoke.json)
is retained separately from diagnostic successes. No causal timeout-fix or
runtime speed improvement is claimed; current Windows readiness remains open.

The same unmodified `8e1909d8` executable now passes its original New Game
tester locally: [raw report, receipt and actual world capture](windows-local-main-8e1909d8/README.md).
Its original start-message-to-stage-ready interval is18,419.5ms, with no
experimental flags or errors. This is separate from the retained CI negative;
neither a controlled speed improvement nor all-device acceptance is inferred.
The same executable's original local Continue/minimize/restore test also passes:
all21 measured fields remain identical over300,241.7ms, the menu pause survives
restoration and simulation resumes normally. Its readiness interval17,656.3ms
excludes the hiding interval; the complete original report and separate receipt
are retained with the New Game evidence. CI remains a separate negative.

The unmerged readiness-observation branch now supplies an actual original CI
failure with more precise state: [run37988150847/source945ab0ba](windows-loading-regression/readiness-945ab0ba/README.md).
At timeout, observed transfers and the native chunk queue have no pending work;
the active awaited boundary is `warm-compile-world`. The existing World context
identifies Microsoft Basic Render Driver without context loss. This directs
investigation toward world shader preparation but does not identify a pending
material or prove a driver defect. Nested wall spans are not additive GPU
measurements; original timeout and readiness semantics remain unchanged.

The worker branch now has a separate
[exact-executable native accessory pilot](workers-frontside-local-3e8da8a7/README.md):
youngMale crate/hoe,48 sampled day/night poses, actual culling witnesses and
serialized-state/mixer/resource restoration pass locally. Root inspected the
accessories from two angles; partial head framing limits character acceptance.
No GPU timing ran, and this is neither all-profile validation nor production
activation. Its original Windows CI loading failure is retained separately.

The full objective remains the master plan plus the user's subsequent changes.
The original 159-case registry has 157 historical verified labels and two partial
cases (QA-014 and QA-156). Those labels retain their original sources and scopes;
they do not establish final acceptance of all later features on this main.

| Requirement | Authoritative current evidence | Remaining acceptance |
| --- | --- | --- |
| Authored V4 crops with FrontSide | PR17 merged at `81d87953`; 40 states/32 bridges, source/attribute/morph contracts, native fixture and exact-head Validate/Windows evidence in [root review](crops-v4-root-integration-review.md) | Workers remain a separate repair category. Do not reuse the abandoned crop-repair experiment as evidence for authored V4 or claim all device/culture visual coverage. |
| Interactive loading and visual/audio refinements | PR18 merged at `53a4a996`; user accepted G's load/responsiveness compromise; actual New/Continue, cancellation, shared V4 ownership, progress and camera evidence in [production G](interactive-loading-development/production-g-final/README.md) | Current Windows loading smoke fails at its unchanged deadline; diagnostic and opt-in compiler candidate remain separate. Physical peak RAM/VRAM and complete current mobile coverage are unproven. |
| Native menu library fullscreen | Actual native entry corrected by `7b8d5fb0`, included in `f5e796c2`; [controller, build and package evidence](library-native-integration/README.md) | Earlier fullscreen evidence covered a different entry. All four actual labs in portrait/landscape still need rendered acceptance; CUA initialization currently fails. |
| Full web validation of library/routing integration | [Run37934148381](validate-f5e796c2/README.md) passes 3719/3719 tests, assets/audio/plan/balance/syntax/build/package on exact `f5e796c2` | Later changes have independent CI. This is not Windows, physical visual/audio or campaign-matrix acceptance. |
| Spirit narration lifetime | `1ed8be18` separates buffered download stalls from actual playback waiting; [22 directed tests, pre-fix failure, build/package](spirit-buffered-stall/README.md) | Real audible regression acceptance remains open. Media doubles do not identify the original physical event sequence. |
| Responsible campaign economy | Historical Desert/Sahelian run37895465546 wins100 nights with21.7233% inactivity; [retained summary](campaign-balance-recovery/desert-saheliana-37895465546/desierto-saheliana-summary.json). Current Canyon/Sahelian survives10 but records77.5333%; [physical-domain and budget attribution](canyon-budget-f5e796c2/README.md) | Current30-combination100-night survival/accounting/activity and bad-management coverage remain open. The economic agent tests isolated real-parameter candidates with unchanged strategy/gates; none is promoted. |
| Stable camera traveling | [Explicit user acceptance](streaming-travel-dense/user-acceptance-2026-10-09.md) closes this point absent a reproducible regression | Older negative candidates remain disabled; do not keep this accepted point open solely because historical traces contain spikes. Loading preparation is a separate requirement. |
| Post-Jam camera close-up protection | [Specification and optional geometry prototype](../camera-close-protection-post-jam.md) | Normal gameplay activation, model margins, trees, secondary fade, controls/streaming visual acceptance and physical mobile remain open. |
| QA-014 hidden web/mobile tab and QA-156 full gameplay A/B audio | Original registry still marks these partial; Windows hiding and individual spirit clips have narrower scopes | Complete physical web/mobile hidden-tab and perceptual/full-campaign audio proofs remain necessary. |

The physical Pixel/Chrome/itch Wake Lock acceptance remains accepted and is not
a priority absent regression. SFX126 inventory has100 assignments and26
reservations/alternatives/context exceptions; this is a source/caller audit, not
complete audible trigger coverage. Continue remaining post-Jam work from the
[pending list](../post-jam-pending.md), retaining scope and current user overrides.

## Historical checkpoint details (superseded where noted above)

The following notes originally described PR16 at `4ecffec5`, older rendering
base `795f773e83640d3f7541d8e3d826764c3d779750` and work before PR17/18 merged.
Statements that features were unmerged or checks were live are historical.

## Responsible campaign acceptance

PR13 at `6ac2b672` archives sixteen original terminals from frozen `3324d17d`:
eight victories pass the strict daylight inactivity threshold below 25%; four
Canyon victories and Desert/Mapungubwe fail that threshold; three Desert
incursions remain unresolved in that sixteen-case archive. The seventeenth
original, Desert/Saheliana job 113646986727, has now ended in failure at day 100,
99 completed nights, with an unfinished retreat. Its full original failure is
retained; no final report, victory or activity approval exists. Neither
unfinished campaigns nor victories above the threshold count as complete release
acceptance. These sources precede the marginal legacy retreat recovery in PR12.

Root independently verified all 156 payload receipts of the sixteen-case
PR13 head `6ac2b672`: 200,435,248 original bytes, including gzip integrity,
JSON decoding and recorded source-count/activity fields. This does not rerun
simulation or independently repeat the original source/domain audits.
Both exact-head CI checks passed, and PR13 is merged as `dbe4d1ed`.
This integrates the archives, not approval of their rejected/unfinished cases.
See [the expanded receipt](campaign-ci/root-pr13-expanded-archive-review.json)
and [reproducible verifier](campaign-ci/verify-root-archive-receipts.py).

The final original was subsequently integrated from `747247fe`. Root's expanded
byte/receipt check passes for all seventeen archives: 163 original payloads,
214,785,301 bytes. See [the seventeen-case receipt](campaign-ci/root-seventeen-archive-review.json)
and [the final failure](campaign-ci/current-3324d17d-terminals/desierto-saheliana-37876748172/README.md).
This archive check is not a new domain/source audit or a current-main recovery
replay. A subsequent native replay against PR15 remained stationary for 300
simulated seconds. PR16 (`ee1954c2`) proposes actual footprint-corner connectors
for the physically open subcell passage missed by the existing lattices. The
original snapshot then exits physically in 18.1 simulated seconds; 103 tests
pass. Root reviewed the bounded fallback and its original-state/dt/reload tests.
Both exact-head checks now pass. Root independently repeated 14 directed tests
and merged PR16 as `4ecffec5`, then pulled main. See [root review and exact scope](saheliana-final-raid/root-pr16-review.md).
This saved-state recovery is not a new hundred-night campaign.

Root dispatched a new original-policy Desert/Saheliana hundred-night campaign
on immutable main `0544d652`, plus the existing separate poor-management
diagnostics across six biomes. [Run identity](campaign-ci/current-pr16-dispatch-37895465546.json)
records run 37895465546 and both job IDs. Both were observed in progress at
checkout; only authoritative subsequent job state/artifacts may establish
completion. The old failure is retained and the activity/survival gate remains
open until terminal evidence is audited. The separate poor-management job has
now completed: root independently verified 324 source hashes plus the runner,
six native snapshots/accounting/delivery audits and exact summaries. Five
biomes naturally lose, while Canyon survives the ten-night diagnostic; neither
outcome is altered. See [current poor-management evidence](campaign-ci/current-pr16-poor/README.md).
The responsible hundred-night job remains separate and unfinished.

The three distinct saved Desert stalls now have bounded native recovery fixes
in merged PR15, with root 45/45 directed tests and both exact-head CI checks
passing. See [root review and scope](desert-raid-connectivity-root-review-2026-10-09.md).
This does not convert the original unfinished campaigns into victories.
Next proofs: measure actual
responsible reinvestment under justified game balance changes, retaining the
original policy/seed and negative records; complete the required biome/culture
coverage and bad-management loss tests. Static margins or short campaigns cannot
replace hundred-night survival, physical crate delivery and activity evidence.

The original income pilot `2bdac97e` has now completed 100 nights in Canyon /
Mapungubwe, with 15,200 physical deliveries, but still fails activity at 36.0967%.
Root repeated the source/snapshot/accounting audit: 321 hashes match and the
complete physical summary agrees. See [the review](campaign-balance-recovery/root-pilot-review/README.md).
The economic candidate remains unpromoted. Intrajornada task/route evidence is
needed before another balance adjustment; its final cleaned-up snapshot cannot
establish worker utilization.

## Interactive loading

`feature/interactive-loading-screen` remains unmerged. Its original acceptance
requirements and later visual/audio refinements remain binding. Root native QA
confirmed real pending-download cancellation on `31a5fa3e`, and persistent,
manually dismissible Spanish preparation-error feedback on `d69d7c68`. Those
observations do not prove peak RAM/VRAM or complete audio cleanup. Root actual
menu slow-load 908 reached verified readiness and gameplay; a native planting
gesture triggered SFX 028 and loading voices were empty after handoff. The
English failure 909 persisted with Dismiss, but retained a Spanish technical
detail. The later correction was confirmed natively on `e46a8da0`: English
technical detail, persistent notice, dismissal and cleanup, with no console
errors. This functional check is not a performance or memory measurement.

A thirty-combination functional matrix completed on frozen `1bf0fb0d`:
all thirty report readiness, camera/logical restoration and teardown, with no
pending downloads or errors. This is fixture coverage, not actual-menu coverage.
Concurrent light CPU work is declared: its timings cannot establish performance.
Even a complete matrix will not replace actual New/Continue menu paths, mobile
touch and orientation, reduced motion, cold/cache/slow progress behavior,
before/after total load and frame-time measurements, resource peak/lifecycle
checks or final day/night visual acceptance. No premature PR or merge.

The sequential main/feature loading ABBA on frozen `6ce847a9` / `e46a8da0`
found an unresolved readiness regression: reference 7.150 / 7.341 seconds,
feature 11.967 / 10.206 seconds, excluding its intentional 4.09–4.11-second
cinematic. Root inspected all four raw terminal and cleanup reports: no errors,
released contexts, and both feature logical/camera checks pass. Feature frame
delivery is smoother, but the reference heartbeat does not render a diorama;
this is not a GPU/FPS comparison. Cache/transfer drift and sampled heap limits
remain explicit. Investigate the extra world-load preparation before approval.
Raw evidence remains on the loading feature branch pending its final PR.

The latest reference-directed visual work is on that feature branch:
`d9c3a1fd` adds the generated wooden/vine/sunflower/parchment ornament, a closer
four-maize composition, mountain backdrop, one instanced sparkle draw and an
analytic light shaft in the existing mist pass. `6045fb98` fixes the visible
rectangular mountain base, soil saturation and portrait plant cropping. Root
inspected its native day/night landscape and stable portrait screenshots:
the composition is substantially closer to the supplied first mockup. The
transient night-portrait resize image is retained separately as a negative;
the narrow parchment hint still needed refinement. `c7c26463` addresses that
CSS fit; its functional capture is pending at this review. This is AI visual
screening, not user acceptance or proof of neutral GPU/peak memory cost. The
new backdrop may coexist temporarily with the world's atlas. Its before/after
render/resource measurements and the original loading-readiness gate remain
open. No loading assets or runtime have been promoted to main.

## Rendering and streaming

The native repaired mature-maize comparison has net GPU benefit, but is not
approval of all five growth states, morph bridges, other crops or workers.
Original rig/material/UV/animation compatibility, convincing in-game multiview
appearance and final controlled benchmarks remain necessary. Pixel differences
are diagnostics, not automatic rejection. No experimental asset is promoted.

Root's three native young-maize FrontSide stills confirm actual BACK culling for
all three colour groups, recognizable maize in day/night/elevated views, and
released contexts. The standalone archive check passes; shadows remain DoubleSide.
See [the retained images, original reports and limits](frontside-model-pilot/young-front-native/README.md).
This is limited AI screening, not full growth/WorldScene coverage, human-user
approval or the young candidate's own net GPU benefit.

Two subsequent sixteen-second native growth runs retain 1,752 chronological
frame records and ten capture moments. The incoming/outgoing original bridge
phases are preserved, and the young state has actual Front/BACK/CCW colour
witnesses where active. Root reviewed both full atlases; their independent
standalone receipt check passes. See [Front growth evidence](frontside-model-pilot/young-front-native-continuity/README.md).
This remains limited AI still screening with Double shadows; the record is not
a full-video inspection, a WorldScene/GPU benchmark or approval of other models.

Root also ran the young WorldScene resource fixture on frozen `4bb26a95`.
The image and teardown completed, but the report POST failed with
"Unexpected report": the server's initial status whitelist omitted the young
profile. The native console/status/PNG negative is retained by the repair
branch. `db62ee83` unifies POST/preflight status validation without altering the
viewer or geometry. The subsequent root native repeat exported its original
resource receipt successfully: 1,257 instances, 68,996 additional observed
buffer bytes during coexistence, actual Front color and world-depth witnesses,
unchanged inputs, and released context. The branch archives the successful
repeat separately from the failed export; this is resource evidence, not GPU
timing or promotion of the old candidate.

The user has replaced the crop repair experiment with the supplied
`Bioma_Cultivos_Lab_V4_Culling.html` inside `1-biomas.zip`. The old young-crop
timing/repair research is stopped. Integration now uses the supplied compatible
40 crop states and 32 transitions, baked reproducibly from that lab, compressed
without breaking attributes or transition correspondence, then checked for
functional and visual compatibility. This work is on `codex/lab-v4-crops-frontside`
from `1e353f8f`; no new crop assets are promoted yet. The experimental branch and
its negative/positive evidence remain preserved.

Root's isolated original-environment comparison on `5be52f44` has 3,360 valid
GPU samples across Sabana and Mangroves. Total mean savings are 13.9% / 16.9%,
with all four paired total/color differences positive. Shadow-only gains are
inconsistent. The user accepted the six before/after visual pairs and explicitly
authorized activation for every biome. `5e51cf45` enables native prop color and
shadow FrontSide, including their private solid shadow input. 37 directed tests
and native Front/BACK/CCW smoke checks in all six biomes pass. After disk space
became available, root's `e20bf93a` build, web-package verification and itch ZIP
CRC check passed. CI remains separate: runs 37901173427 / 37901173610 on
`1994b7a8` were still executing at the last observation, and the newer `e20bf93a`
runs were pending. These are not new six-biome performance or exhaustive night
measurements. See [the activation and evidence](environment-frontside-ceiling/production-front/README.md).

The standby-pruning traveling comparison is negative and stays disabled. Shared
resident preparation also has a completed root native AB/BA comparison on
frozen `795f773e`: all four p95 frame intervals are 116.4 ms, with 1004 GPU
queries, unchanged logical state, and released contexts. No demonstrated
frame-stability benefit; it remains experimental. The immutable reports and
reproducible verifier are now in main at `cad08d84`; root verification passed.
A separate seam-preparation isolation candidate (`4390237e` versus frozen
`795f773e`) now has a root native ABBA: 1005 valid GPU queries, all four
logical states unchanged, 25-to-40 generated chunks, no errors or pending
queries, and released contexts. Its p95 frame intervals are 116.5 / 116.4 /
116.4 / 116.4 ms; intervals above 100 ms are 25 / 22 / 23 / 18. This does not
demonstrate a general frame-stability improvement and does not approve activation.
Raw reports are archived in main at `b91b06c7`, and root's verifier passes with
`performanceAccepted:false`. See [the negative result and clock attribution](streaming-travel-dense/seam-isolation-abba-b6edd148/README.md).
The
separate instrumented functional runs end with zero observed live buffers;
their timing is not used in the benchmark. All draws, uploads, queries and cleanup
must be attributed without summing union statistics counted in multiple adapters.
The requested outcome is stable movement during new chunk/impostor preparation,
not a higher average FPS at the expense of travel spikes.

## Other explicit pending requirements

- Frozen economic candidate H (`d667b537`) now has one accepted responsible
  Gran Cañón/Saheliana 100-night case: victory, physical deliveries every day,
  18,320 paid crates and 6,836/30,000 seconds of daylight inactivity (22.79%).
  Both terminal auditors pass and all 376 source hashes match. Root independently
  checked the nine original archived payloads byte-for-byte. The unchanged first
  ten days remain a 25.47% negative, and the final forty-day band remains 26.87%;
  the accepted criterion applies to the full campaign aggregate. See
  [originals, audits and limits](economic-candidates-a518/h100-terminal/README.md).
  Six poor-management cases, the thirty-case matrix and compatibility with
  current main remain pending. No experimental economic parameters are promoted
  by this evidence-only integration.

- The 126-SFX source/caller audit is integrated through PR14 (`6ce847a9`):
  100 assigned, 26 reservations/alternatives/context exceptions, exact bytes
  verified. Root freshness check and three audit tests pass on merged main.
  Audible/trigger acceptance remains pending; later runtime changes require
  regenerating and reviewing the inventory.
- Camera close-up protection, final horizon/backdrop direction and the remaining
  post-Jam requests remain tracked in [the pending list](../post-jam-pending.md).
- QA-014 still lacks the complete physical web/mobile hidden-tab acceptance
  described in its registry; native Windows evidence has a different scope.
- QA-156 still lacks its documented perceptual/full-campaign audio acceptance.
  Root native English Spirit QA independently confirms natural audio completion
  and retention of the current presentation while a real centre action advances
  tutorial logic. See [the evidence](library-spirit-ended/english-natural-914/README.md).
  This fixture does not cover all voices or full gameplay audio.
- Published itch.io Wake Lock has physical Pixel acceptance from the user;
  additional work is not a priority unless a regression appears.

Green builds, numerical auditors and isolated fixtures must retain their exact
scope. Close each gate only against current, requirement-matching evidence.
