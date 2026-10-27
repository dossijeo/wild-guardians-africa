# Deferred UI corrections: implementation entry points

No runtime changes made while the performance comparison runs.

- Fullscreen overlay durations are defined in src/ui/overlay-policy.js: critical .25s, magic .3s, victory1.5s. This confirms the user report. Target2–3s, preserving one active overlay and bounded/no stale queue. Existing priority and duplicate suppression should be retained and tested under rapid magic, critical damage, blocked UI, result overlays and reduced motion. Inspect screen-overlays.js and overlay-painter.js for normalized animation envelopes before changing durations.
- Menu plate parallax is in src/ui/menu-landscape.js, composed into its menu runtime. Near foreground zoom currently1.035+travel*3.5 versus distant1.025+travel*.14; offsets also differ. A real support layer must follow the totem projection/foot across navigation travel, wide/portrait aspect and pointer parallax, rather than merely adjusting background speed. Preserve particles and existing close-in animation.
- Character LOD remains parked by user request.
