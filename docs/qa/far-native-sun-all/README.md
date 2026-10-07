# Native fixed-sun atlas regeneration

Offline baker source 2a1feff; flag native-sun=1, LOD2, elevation8°, eight views × eight tree yaw orientations,128px cells,1024² atlases.44 variants/22 native tree slots/six biomes. Generated only via QA browser UI, not gameplay.

All44 metadata report GL0/errors0. PNG→losslessWebP visible RGBA exact; alpha exactly equals both PNG and previous deployed atlas. Spatial frame/source bounds/base/dimensions/triangles agree within1e−12 (JSON roundtrip last-bit differences recorded by the verifier). Deployed spatial metadata is kept unchanged; only lighting direction flags and images change. Existing hull alpha silhouette remains valid.

All phases use actual NATIVE_LIGHT_DIRECTION multiplied by240: [-193.08041382469224,122.4412380351707,72.99381498250561]. Day/night color changes are intentional. No normal atlas or additional runtime lighting samples; dimensions and estimated GPU allocation unchanged. Compressed total20,450,296→20,486,294 bytes (+35,998). This is asset size, not GPU RAM.

The bake retains its existing no-native-shadow recipe; it does not add dynamic world self-shadow to the offline atlas. The separate self-shadow counterexample remains documented. Full moving-camera/biome/day-night acceptance and current performance remain pending. OFF in normal gameplay.

verification.json stores checks/hashes; bake-metadata.json.gz stores44 native reports. verification-script.cjs reproduces the conversion comparison using the locally retained PNGs and previous WebP sources; its old-alpha/color baseline must be retained before replacing assets. Historical baked source differs from later QA phase controls only, not its renderer/geometry/shader.
