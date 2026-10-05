# Cold actor and partial-disposal regression recovery

[Validate game on c423655](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37276843900) completed 1774 tests with 1770 passes and four failures. The initial 40 selected animation/material/shadow checks did not include `raid-presentation-ready.test.js` or `world-disposal.test.js`.

The preload change assumed `animalPreload` existed when attaching an animal and `mixers` existed during disposal. The established cold-actor and partial-world fixtures deliberately omit those resources. Without a preload library, actor loading threw before requesting the GLB; disposal also threw instead of completing cleanup.

The renderer now retains the original Assets-based loading path when no preload library exists. A loaded production world continues to consume prepared rigs. Both paths retain stale-world and replaced-root checks. Disposal iterates actor mixers only if present, so partial cleanup still completes once.

The original failing tests remain unchanged. Running `node --test tests/raid-presentation-ready.test.js tests/world-disposal.test.js tests/animal-preload.test.js` passes all 11 cases, with zero failures or skips. Production build and web-package checks pass. The subsequent complete local run also terminated successfully: 1774 tests, 1774 passes, zero failures, cancellations or skips (916726.5568 ms). This suite ran while the UI review continued and is not a claim of an immutable-HEAD campaign. GitHub Actions require their own terminal results before being described as passing.
