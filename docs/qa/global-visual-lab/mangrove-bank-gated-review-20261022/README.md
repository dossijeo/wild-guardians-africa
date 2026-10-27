# Shore-distance gated water sediment

`qa-mangrove-bank-sediment-gated-20261022.js` computes the derivative-based fine-detail attenuation before branching, then skips both noise evaluations when interpolated shore distance is >=3.5, the maximum possible sediment width. Outside this range the former blend weight is exactly zero. No additional textures, geometry or passes.

Run capture-mangrove-bank-gated-review-20261022.mjs (Vite 5190). All six RGB frames match the owned wetland candidate exactly, seed712/media/1280x720/day/night. Controlled texture lifetime checks still pass. See sibling mangrove-bank-gated-cost-20261022 for measured performance. Static parity does not establish all motion/horizon edge cases; live streaming remains pending.
