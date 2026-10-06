# Remaining RGB8 PNG terrain maps in lossless WebP

Five source PNG maps are replaced in the distributed package by exact lossless WebP aliases: the shared Savanna/Grand River normal and packed data maps, Grand Canyon packed data, Volcanoes packed data and Desert normal. Their original 1024 x 1024 dimensions and all decoded channel values are unchanged. Encoded saving is 1,100,191 bytes; net package saving against 9806af9 is 1,091,342 bytes including aliases/metadata overhead.

23 directed tests pass. The full package verifier reports 586 files, 389,583,418 bytes and 859 relative links, with no original-map duplicates. The current image inventory contains 225 entries: 197 WebP, 26 JPEG, one PNG and one SVG. The remaining PNG is the original menu terrain mask (unclassified; requires separate grayscale/data review). All eligible classified RGB8 normal/data PNG files from the current distribution have now been converted; this is not completion of the entire image task.

The native WebGL2 fixture tests all seven data-map variants, including the previous two Mangrove atlas maps. Both source Vite and compiled nested routes report zero differences across 54,525,952 readback values, with native hashes identical to independent raw decode hashes. The five new maps account for 20,971,520 values. No color/gamma transform, resampling, rotation, shader operation, extra sampler or per-frame QA code is introduced into normal gameplay.

Reports preserve the original pilot stage; these follow-up checks establish integration. Original sources stay in Git, while the game dist contains only the smaller runtime variants. Test-only original-images copies belong to the QA server, never the game package. Lossless conversion uses the locally verified exception for shader data, while display-color optimization uses Tinify.

Remaining scope includes other JPEG/WebP images, unclassified assets, embedded GLB image policy, native Windows/mobile checks and visual coverage. The memory at GPU upload is unchanged because dimensions/channels are unchanged; encoded package reduction is not an FPS claim.
