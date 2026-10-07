# Current public atlas hull reference

Generated with node tools/experiments/prepare-impostor-hulls.mjs docs/qa/far-hulls-current-public/hulls.json from the44public phase atlases. Compared to docs/qa/far-native-sun-matrix/hulls-native-sun.json, all22hulls (coordinates, area and opaque union pixels) are identical; only savanna-2 day/night hashes reflect the reviewed linear-alpha files. No atlas, shader, runtime metadata or geometry changes.

impostor-hull.test.js uses this current reference while retaining exact equality with historical conservative shapes. It verifies SHA256 plus every nonzero alpha sample in all cells and phases. Four tests pass. The historical sunlight/alpha receipts remain unchanged.
