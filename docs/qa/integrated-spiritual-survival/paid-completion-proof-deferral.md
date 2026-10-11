# Defer ineligible paid-completion proof

The funded-defense policy previously ran the exhaustive native perimeter proof before returning `!plan.pieces.length && !plan.updates.length && proof.valid`. Proposed pieces or updates make that conclusion false regardless of physical certification. `nativePaidContourProof` now returns an explicit deferred/nonvalid diagnostic for those cases, without touching terrain or navigation. Empty proposals still enter the unchanged integrated physical proof. Predictive certification used to select an unpaid construction plan remains unchanged.

This modifies the QA player's policy execution cost, not game economy, wall commands, physical defense or balance. It does not certify unpaid defenses. Diagnostics now explicitly distinguish incomplete paid construction from an attempted physical certificate.

15 tests passed: the four deferral/forwarding tests, ten existing native funded-policy tests and the real incremental Canyon completion certificate. Existing tests cover ledger debits, paid partial purchases, gate creation, reload, protected wages, native vegetation removal, funding and completion. The new tests verify no physical query on incomplete proposals, no state/proposal mutation, and physical proof entry for an empty proposal.

## Stopped v111 snapshot

`v111-stopped-paid-completion-cost.json` records a read-only probe against the retained native snapshot (SHA a7a7d012f02004f07b9e3f2c22e9d8087ccd0d5f436f80abd1df708a9208ee7e). It is day 9 at time 36 with 178 living plants. Its already completed contour quotes **zero** new pieces and updates; quote time was 42.01 ms. Deferral therefore does not apply to this exact snapshot. No exhaustive proof was timed and no full-campaign speedup is established. The four differences from the original frozen source are recorded in the JSON; this is not a replay claiming identical whole-campaign sources.

An initial diagnostic rejected the snapshot because it expected an incomplete planned contour. Inspection revealed `planned=null` and a retained completed contour. The revised probe preserves this negative finding rather than substituting an invented incomplete plan.

Next performance investigation must measure complete-contour recertification and the existing component-reuse integration on representative stopped snapshots. The user's embargo on further 100-night campaigns remains in force until end-to-end short tests establish acceptable runtime.
