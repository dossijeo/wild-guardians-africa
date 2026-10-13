# Full test-suite comparison, 13 October 2026

The captured TAP files are `main.tap.gz` from `main` at `f3cf6a2aee967054ae30ff3ed8a9a4b00bd0839c` and `experimental.tap.gz` from `codex/campaign-unfunded-geometry-guard` at `746c3765cb1f23829d92915d1af032f4d239a70b`. Both were run locally with `node --test tests`. The trees contain different numbers of tests; counts alone cannot establish causality.

| Tree | Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| `main` | 4,150 | 4,011 | 139 |
| Experimental | 4,312 | 4,240 | 72 |

Comparing exact failed test names: 58 are shared, 81 occur only in `main`, and 14 occur only in the experimental tree. The four `QA-147` postgame crate-value failures are shared and reproduce when run independently in `main`; they do not originate in the early-wave preview.

The 14 experimental-only failures need triage against earlier revisions of the experimental branch before integration. They cover a pressure RNG assertion, a crop-damage history assertion, two agricultural-magic assertions, four virtual-policy/economic assertions, the D/E control-profile assertion, Desert day-59 traffic, two projected exterior-entry assertions, a bounded Saheliana connector-search assertion, and a Canyon water-plane assertion. In particular, the exterior-entry and connector tests may signal physical navigation defects and must not be dismissed as stale expectations without reproducing their fixtures.

This comparison does not approve the experimental branch. The next step is to isolate those physical-route failures and the daytime worker path spikes, then rerun targeted tests and pilots. The user-requested managed 100-night balance campaign remains paused pending acceptable performance.

Follow-up: the two `raid-projected-detour.test.js` failures were outdated assertions from before whole-cohort exterior entry could split into two independently certified formations. The test now checks the complete group with `exteriorGroupWitness`, each native birth/exit collision and spacing, and a bound allowing two proof searches. Both directed tests pass. This is a test correction only; it does not change entry behavior or weaken the physical witness requirement. The remaining experimental-only failures still require separate diagnosis.
