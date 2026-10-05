# Native village and wall sidedness audit

The audit expands the existing prop/LOD analysis to the actual native building units and wall endpoints used by the game. It reads the five village binaries with their eight-float interleaved stride and indexes only each unit's draw range. Referenced vertices are remapped without changing their coordinates or triangle ordering; unrelated village vertices cannot affect an individual unit's result.

The exact-position topology test requires opposite orientations along every paired edge, no degenerate triangles and positive signed volume in every connected component. All five village atlases and the wall atlas are opaque. None of the 46 village units or 20 native wall endpoints passes the closed-outward criterion. The report retains open, non-manifold, inconsistent and degenerate counts, connected components, signed volumes, source binaries, textures and catalogue hashes.

This is a conservative rejection of automatic FrontSide eligibility, not a proof that every surface needs DoubleSide. A broader visual experiment could still compare category-specific views, occluded openings and both shadow/color passes. No renderer material or model changed and no GPU/FPS improvement is claimed. The endpoints do not prove bridge-intermediate topology, articulated doors, procedural work-center interior/ash, crops or character skinning.

Reproduce from repository root:

```
node tools/audit_structure_face_sides.mjs docs/qa/structure-face-sides/topology.json
node --test tests/mesh-sidedness.test.js
```

The four existing analyzer tests pass for closed UV-seamed geometry and rigid transforms, separate invalid-edge/degenerate conditions, inverted disconnected components and exact-weld gaps/malformed inputs. The input fingerprints were independently compared with current files.
