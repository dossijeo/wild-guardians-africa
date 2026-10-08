# Six-biome four-silhouette native review

The QA harness now accepts `arcs=1&arc-cells=4&arc-base-fog=1` for all six biomes. Day/night controls,73-pose360° rotation, explicit camera elevation, derivative-footprint diagnostic, receipt invalidation and close/dispose remain available. Sabana's previous composition and source/output bytes are unchanged.

Use `http://127.0.0.1:5192/tests/browser/hq-mountain-horizon.html` with these query values:

|biome|Primary height(m)|QA elevation(m)|
|---|---:|---:|
|sabana|110|4|
|gran-rio|85|4|
|manglares|60|4|
|volcanes|160|4|
|gran-canon|130|80|
|desierto|115|4|

Append `&elevation=80` for Cañón above the native plateau;180m remains an exploratory sky-heavy pose. Heights scale all four silhouette categories by the same factor, maintaining4:1 source aspect and angles0/95/185/275° plus deterministic seed offset. Six tests verify unchanged default composition, positive angular valleys even for the tallest160m profile, bounded height and invalid inputs. One merged96-triangle mesh, one texture sample, one atlas per biome.

These are QA candidates, not replacement public textures or profile defaults. Source/output contracts reproduce all six atlas files; native four-cell reviews and movement/filtering/cost still precede activation. The harness rewrites UVs and reports each RAF and loads an unused original comparison texture, so its timings/memory are not a production benchmark. Keep CPU mip-provenance counterexamples and the limited scope of derivative diagnostics.
