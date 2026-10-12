# Flat lookup candidate and bounded diagnostic, OFF

Source `68f25572`, separate branch after the exact mixed/negative nested-cache replay (`74920d06`). No prior payload or measured source was overwritten. Defaults remain lattice OFF and nested storage; only tests/microprobe explicitly select flat storage. No main/src/content changes, campaign or long protected replay.

The new key is an exact bijection for integer coordinates in [-8192,8191] on each axis: `(x+8192)*16384+z+8192`, integer range [0,268435455]. No precision loss, hashing collision, rounding or clamp occurs in that domain. Coordinates outside it, nonintegers and both zero axes use the native function. Excluding both zero axes preserves signed-zero behavior conservatively. One flat `Map.get` replaces nested `get/has/get`; undefined native values remain uncached. The existing synchronous ownership, deep/method rejection, epoch invalidation, finite lease capacity and native fallback are shared unchanged.

Seven directed tests pass (2807.1575 ms): key boundary/sign uniqueness, unsupported coordinate fallback, bounded capacity, exact heights and surfaces across six biomes, unchanged state and all existing lease safety tests. This is not full protected-report acceptance of the flat variant.

`tools/probe_qa_lattice_lookup.mjs` ran one bounded warm microprobe on the exact retained real day-8 state. Corpus: 1584 floor-grid crop-neighborhood points, 552 unique coordinates. Each arm validates every height against native results, warms 10,000 calls, then measures one million lattice calls. State bytes and accumulated height sum stay exact. No commands, fake terrain, modified geometry, policy or clock. Original outputs and five source hashes are preserved.

| Arm | Implementation | Lookup-only time |
|---|---|---:|
| A1 | Native diagnostic wrapper | 69.6950 ms |
| B1 | Nested memo | 33.2386 ms |
| C1 | Flat memo | 32.1806 ms |
| C2 | Flat memo | 35.0769 ms |
| B2 | Nested memo | 43.4459 ms |
| A2 | Native diagnostic wrapper | 90.9858 ms |

Means: A 80.3404, B 38.3423, C 33.6288 ms. This verifies a simpler lookup can be cheap, but does **not** explain the whole-protected replay's first-B regression or establish a campaign gain. Nested memo itself also beats native lookup in this warm micro despite regressing 15.69% on average in the full prior fixture. Thus cache-hit/lookup results alone cannot justify another large trial or activation. The micro omits most real query distribution, surface interpolation, collision loops, JIT interactions and larger working sets. Flat storage has 36,930 native calls versus nested 552 due to deliberate zero-axis fallback, with no changed values.

A useful next bounded diagnostic would exercise the native surface/slope/coarse-collision pipeline over real retained farm coordinates, with exact outputs and no gameplay changes, to identify the gap between this lookup-only result and whole proof timing. Inactivity stays outside acceptance criteria. No GPU/frame, 100/180-night, balance or current-main claim.
