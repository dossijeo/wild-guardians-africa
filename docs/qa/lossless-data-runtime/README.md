# Exact data-map WebP runtime variants

Two 2048 x 2048 RGB8 mangrove prop-atlas maps now resolve through image-runtime.json: the normal map and metallic/roughness map. They use local lossless WebP, preserving all decoded channels. Tinify color optimization is deliberately not applied to numerical shader data: it would require exact-value validation, not a visually similar photograph. This is the lossless exception required by the image-conversion task.

Normal: 8,117,153 -> 7,901,198 bytes (215,955 saved). Packed data: 4,073,016 -> 3,256,300 (816,716 saved). Total encoded saving: 1,032,671 bytes. Package: 390,674,760 bytes, 586 files and 859 relative links; no original image duplicated. Net reduction versus f7906f6's package is 1,029,145 bytes after manifest/bundle overhead.

Local RGBA8 raw comparison has identical SHA-256 values for source and runtime maps. No resizing, gamma, rotation, profile transform, vector manipulation or texture-coordinate changes. Only static RGB/RGBA8 PNG/JPEG/WebP without ICC, orientation transforms or animation is eligible; grayscale and 16-bit need separate review. A candidate is retained only if every raw channel is equal. Non-shrinking candidates should not be deployed.

18 directed tests pass, including independent RGB samples, one-channel mismatch detection and rejection of real 16-bit PNG. The package verifier checks encoded hashes, dimensions, alpha and exact decoded data values.

Native WebGL2 checks pass from Vite and a compiled nested /nested/itch/audio-qa/ route. Source and runtime ImageBitmaps are uploaded as RGBA8 with color conversion, premultiplication and vertical flip disabled, attached to a framebuffer, and read back. Each map compares 16,777,216 values with zero differences; native readback hashes also equal the independent local raw hashes. The native reports and screenshot are archived here.

The compiled QA server keeps original maps only under its test-only original-images folder; they are excluded from the actual game dist. WebGL2 readback is a QA probe, not code executed in normal gameplay. Original public source assets remain unchanged in Git. Historical pilot reports preserve acceptedForRuntime:false from before the subsequent native validation documented here.

This demonstrates exact map data and route/packaging preservation on the tested browser. Windows/mobile acceptance and remaining image conversions are still pending. There is no FPS or GPU-memory improvement claim: dimensions, format at GPU upload and shader operations are unchanged.
