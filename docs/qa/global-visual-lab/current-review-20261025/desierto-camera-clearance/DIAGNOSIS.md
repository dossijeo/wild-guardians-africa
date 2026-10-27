# Rejected Desert QA trajectory

The generic diagonal camera tracked terrain beneath its target, not beneath its eye. The first full day/night recording (../desierto-current-motion) showed blue foreground at the dune midpoint. Its path/stream execution audit passed but did not test Desert eye clearance. This is not visual acceptance.

A same-path day rerun added actual w.nav.field.surface eye samples. It recorded 277/1680 frames below ground, minimum -2.098985 m, between 17.222 and 22.788 seconds. At the midpoint all desired chunks were installed, no preparation queued/busy, camera clearance -2.098972 m. The rendering symptom is consistent with viewing the underside of one-sided terrain, not evidence of missing streamed ground.

Correction is QA-only: clamp Desert eye to at least 3 m above its own surface sample while preserving XZ path, target and real game rendering. The motion auditor now rejects missing/insufficient Desert clearance. Old failure recordings remain intact; do not compare the corrected camera as an artistic material A/B. No production camera, material, shadow or terrain geometry changed.
