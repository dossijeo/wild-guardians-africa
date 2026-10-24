# Persistent River underlay quality/capacity recovery

Reproduce with `node tools/experiments/capture-river-underlay-mask-persistent-quality-20261022.mjs` and `python tools/experiments/audit-river-underlay-mask-persistent-quality-20261022.py`, Vite port 5190.

Seed 712, world renderer media, 1280x720, paused day/night, fixed camera/wind. Coverage-only cycle: media, baja, muy_baja, media, forced overflow, restored capacity, hidden, visible. Overflow is deliberately induced by setting both draw capacities to one without shrinking allocated GPU buffers. This tests fallback behavior, NOT performance or an ordinary gameplay density.

Six restored RGB images (three per phase) are pixel-exact to initial media. Activation/range follows [1,48], [1,40], [0,40], [1,48], [0,48], [1,48], [0,48], [1,48]. Forced overflow reports 11634 excluded instances; recovery reports zero. No captured GL/console errors.

Frames are captured after TWO renders; this proves settled state recovery only. The render-hook activation currently reads previous overflow before selection, while the helper disables immediately on overflow. Recovery may therefore lag one render. Inspect/fix that ordering before claiming flicker-free transitions or native integration. No FPS or global visual-completion claim.
