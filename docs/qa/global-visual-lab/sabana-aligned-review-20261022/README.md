# sabana: aligned-start visual regression review

Twelve current medium frames (warmup/native, day/night, normal/elevated/reverse), compared with the saved pre-alignment populated captures. All camera/target/time/origin/elapsed/worker pairs match; current elapsed and workers also match the serialized fixture. Full impostors and mountain background enabled, no browser/GL errors. For herbaceous biomes, original distribution/shape and near/far/leaf/triangle counts are identical, with no overflow.

Warm dense grass and shadow separation preserved. Foreground tree still overlaps lower-right framing.

Normal day/night before-after pairs inspected. Additional daytime contact views reviewed for Sabana, Gran Rio and Mangroves, plus Mangrove night contact. Remaining frames have structural checks and downloadable pairs; do not infer every pixel was manually inspected. Comparison labels are before alignment LEFT/current aligned startup RIGHT, unrelated to the earlier Mangrove leaf-choice image.

Reproduce using the original populated capture runner with WG_REVIEW_OUT set to this directory (and WG_FIXTURE_BIOME where supported), WG_COVER_QUALITY=media; Canyon uses capture-canyon-populated-native-camera, Desert capture-desert-populated-frozen. Run compare-aligned-biomes-20261022.py sabana. Sources remain at their original fixture paths. No source graphics changes in this review.

This validates preservation after the startup sampling fix, not new artistic quality or performance. It does not close active-play, continuous camera transitions, long streaming or combined GPU/CPU acceptance. Old benchmarks are not silently relabeled as measurements of this commit.
