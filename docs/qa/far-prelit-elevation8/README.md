# Elevated prelit atlas experiment

Offline acacia LOD1 captures at 8 degrees elevation, 8 relative camera views by 8 tree world rotations for each fixed-light day/night endpoint. Cells remain 128 square pixels; each phase remains 1024 square pixels. Billboard stays vertical. The common projected envelope and baseV preserve the logical trunk foot; the default horizontal recipe is unchanged.

Both WebP files were encoded losslessly with exact RGBA equality against source PNGs. Day: 618770 bytes; night: 538304 bytes. All 64 cells per phase are nonempty, WebGL errors zero, browser warning/error logs empty.

Comparison: camera [0,10,50], daytime, native LOD1, world yaw zero. Native world pixels outside the diagnostic panel exactly match the previous horizontal experiment. GPU readiness and per-ID coverage were verified before capturing native/impostor/background/mixed modes.

RGB occupancy intersection-over-union improves from 91.13% to 93.88% at threshold zero and from 84.63% to 85.89% at threshold eight. These masks include antialias, leaf holes and shading; they are not geometric silhouettes or a perceptual quality score. Inferior bounds still differ by seven pixels at threshold zero. This single view does not establish a seamless transition at other elevations, world rotations, lighting transitions or on mobile.

Reproduce captures with tests/browser/far-vegetation-atlas.html?bake=day&rotations=8&resolution=128&lod=1&elevation=8 (then night). Compare with tests/browser/far-native-transition.html?atlas-lod=1&atlas-elevation=8 at distance 50 after Prepare GPU.

Recalculate masks: python tools/check_far_silhouette.py docs/qa/far-prelit-elevation8 --output docs/qa/far-prelit-elevation8/summary.json

No extra atlas textures, views, render passes or fragment shader operations. Vertex placement subtracts a constant baseV. No measured frametime improvement is claimed. This remains an isolated prototype; the real game does not use this atlas yet.
