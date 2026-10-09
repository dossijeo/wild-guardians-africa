# Current-main directed regression

Root reran the requested Spirit-duration and raid-camera contracts on main
`2617e204`, without changing runtime, assets, save data or test expectations.

Command:

```text
node --test tests/spirit-ended-presentation.test.js tests/spirit-voice.test.js tests/guardian-voice-close.test.js tests/raid-camera-entry.test.js tests/raid-camera-travel.test.js tests/raid-camera-terrain.test.js
```

[Original terminal output](tests.txt): exit 0, 65/65 tests pass, 14,205.1657 ms.
No native GPU context or rendering benchmark was running during this CPU check.

The requests are already recorded at the start of `docs/post-jam-pending.md`.
Library integration and earlier native mobile-layout/control checks are retained
in [the original evidence](../README.md). Natural English audio completion has
[separate native evidence](../english-natural-914/README.md). Approach tracking
has [its own native report and scope](../../raid-camera-approach.md).

This regression is not a new browser run, a listen-through of every voice,
physical mobile acceptance, or a release-stability approval. Manual dismissal
still stops speech; user camera input still cancels automatic tracking.
