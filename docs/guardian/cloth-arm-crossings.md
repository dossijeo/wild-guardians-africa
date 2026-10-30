# Cloth and arm surface diagnostic

At f6721c0ba, ran `node tools/guardian/audit-cloth-arm-crossings.mjs docs/guardian/cloth-arm-crossings.json` against the installed Guardian GLB. Actual GuardianSummons pose sampling includes authored casting, wind and target reach. Four spells, 43 poses each (0 through 2.1 seconds at 20 Hz), 172 poses total. One target at (0,1,0), Guardian origin (3,1,0).

The 1980 cloth triangles and 3477 arm triangles are classified by skin weights: every vertex must have at least 0.6 total weight in the respective bone family. No strict transverse surface crossings were detected in these samples. [Raw report](cloth-arm-crossings.json).

Mixed boundary triangles are excluded. Containment, coplanar overlap, self-crossings within cloth, other target directions and between-sample intersections remain outside this diagnostic. Zero findings are not proof of separation. Existing crossing-algorithm tests include positive overlap, separated/touching negatives and explicit containment limitations. This offline tool does not add any runtime work or alter the model. Combine with close visual review; the rear Multiply recording is complementary, not exhaustive acceptance.
