# Four reviewed worker colors installed

The four gameplay worker profiles passed the bounded [native appearance review](../embedded-worker-color-native/README.md). Their original-derived Tinify outputs are now approved offline recipes, with hash-verified source copies outside `public/`. `expected-installation.json` records the four candidate GLB hashes and expected combined saving of 1,418,728 bytes. `baseline-manifest.json` retains the pre-installation state for exact comparisons.

The full offline compressor completed successfully. `installation.json` proves all four runtime hashes exactly match the reviewed candidates, their combined GLB saving is **1,418,728 bytes**, the other sixteen manifest records are unchanged and all original hashes remain unchanged. The twenty runtime GLBs now total **147,758,956 bytes**. No provider request occurred during rebuilding.

Validation completed:

- Nineteen directed recipe, input, candidate, identity and repacking tests passed; receipt archived with the native review.
- Independent decoded verification passed for all twenty GLBs: geometry and animation byte-exact, alpha preserved, normal images lossless, color PSNR above the existing gate, local decoding correct and no new conformance errors. Inherited original errors remain reported.
- Browser syntax passed for 137 tracked HTML pages / 136 inline scripts.
- Production build passed in 28.93 seconds; the existing bundle-size warning remains. Build duration is not a performance measurement.
- Package check passed: 641 files / 379,685,091 bytes, 859 relative links and twenty runtime GLBs, without original model duplicates.
- Actual ZIP: **329,894,555 bytes**, CRCs checked, all twenty runtime hashes verified, `index.html` at the root, no nested ZIP or duplicate recipe source images. SHA-256: `29fcc1a21c593f0f646e8ada009f00a758da11a2377ec2cb8779340dac45dae1`.

`package.json` records exact ZIP measurements and the hashes of the compressed command logs beside this file. The remaining worker variants and building/menu candidates are unapproved; crop candidates remain rejected. Full-world, mobile and Tauri appearance remain separate gates. No itch deployment or RAM/GPU/frametime improvement is claimed.
