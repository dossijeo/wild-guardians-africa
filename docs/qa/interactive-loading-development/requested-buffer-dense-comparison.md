# Native requested-buffer ownership: dense Continue

Feature runtime `3a14523b`, QA source `652aa66e`; control production source frozen `cdb822f5`. Sequential native contexts 71 and 72 used the same archived gzip save (`8b07b2bfab161272449c722581a1c171504ef885fe9acb3c4dc6f1c286e74a74` compressed SHA-256), the same 1280×720 native viewport and media quality. Deserialized text SHA-256 was `b485768f1cc172c5b174138f2c678e2bfa2d0b544d5316a3e9cb3dddf33f9103` in both reports: day 101, 23,894 historical plant records and 36 workers. This is not a claim of 23,894 living plants. Both resume the native logical state; feature cinematic uses exactly the control's final camera arrays.

The `BufferRequests` probe observes requested buffer storage after renderer construction. Binding queries affect scheduling: **ignore timing/frame summaries for performance comparison**. It excludes texture storage, programs, earlier context allocations, worker heaps, physical VRAM and total RAM. Background historical CPU campaigns remained active; this was not an isolated host.

| Observed metric | Feature | Control |
| --- | ---: | ---: |
| Peak live requested buffer storage | 94,956,936 B | 83,725,946 B |
| Final visible world live buffer storage | 88,729,054 B | 83,236,390 B |
| Texture objects at final sample | 112 | 101 |
| Asset-owner textures initialized at final sample | 28 | 27 |
| Live tracked bytes/buffers after disposal | 0 / 0 | 0 / 0 |
| Unattributed buffer requests | 0 | 0 |

Feature peak is **11,230,990 B / 13.414% above the control**, about 10.71 MiB. Its diorama-interactive sample is 6,227,918 B; world-load 79,763,840 B; far-ready 89,829,746 B; reveal-prepared 94,627,884 B. The diorama's release brings live storage down at controls-ready. These observations show a measurable overlap/reveal cost, not memory neutrality.

Asset inventories have exactly the same eight source GLB URLs after normalizing localhost ports. Texture metadata multisets differ by one initialized anonymous 1024×1024 RGBA/unsigned-byte/linear texture, the borrowed canyon-earth bitmap prepared for the diorama; the control has no other excess asset-owner texture entry. This comparison concerns the asset owner's set only. The renderer counts an additional 11 texture objects overall, so ten objects outside this inventory remain to be attributed (sky/render-target/crop clones are outside the owner). No inference of texture GPU bytes is made from these counts.

JavaScript heap sample maxima were 449,958,011 B feature and 439,119,891 B control. Samples are not synchronized, exclude workers, and use no controlled collection. No total-RAM peak/neutrality conclusion follows.

Both runs completed without errors, verified unchanged logical state, explicitly disposed the world, reported context loss and closed their tabs. The feature additionally verified restoration was unchanged, final readiness and exact camera restoration. Native source save and crop state were not replaced by cinematic maize.

Evidence: `resources-dense-feature-652aa66e.json` and `resources-dense-main-cdb822f5.json`. URLs are the matching resource fixtures with `save=dense` (feature additionally `measurement=1`). Reproduction instructions and probe limitations are in `requested-buffer-new-game-comparison.md`. Additional texture attribution and repeated lifecycle/resource checks remain open. These diagnostics do not approve performance or a PR.
