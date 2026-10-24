# Full-scene ABAB with explicit settling — equivalence still fails

All far adapters reported idle, followed by 45 stable renders before measurement. Waits: approximately 2.1–2.7 seconds. Nevertheless the fourth load (deep) draws one extra call and 5641 extra triangles throughout the path. The first three runs agree on workload; fourth differs. This disproves the assumption that adding a stable preparation wait alone resolves the comparison problem. No shader performance conclusion is justified. Do not discard the inconvenient fourth run or report the first pair as accepted.

Next required control: alternate compiled material variants inside one already-loaded world, with draw/resource diagnostics, rather than treating separately loaded worlds as equivalent. Existing full-scene screenshots remain useful artistic evidence but do not establish benchmark parity. Raw benchmarks.json retained; audit-mangrove-deep-water-full-cost-20261022.py intentionally rejects these results.
