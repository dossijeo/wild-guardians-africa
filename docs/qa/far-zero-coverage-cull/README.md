# Vertex rejection of zero-coverage billboards, opt-in pilot

The fragment recipe already rejects every pixel when vMix*vDensityFade<=0. The pilot collapses that instance's vertices outside clip volume, preserving the existing packing/IDs, positive-coverage vertices, texture/program preparation and fragment shader. Defaults remain unchanged; QA world flag cull-zero-impostors=1. This is neither CPU compaction nor a missing-model readiness shortcut.

47f5ce76 native isolated RGBA8 readback:27 combinations (distance5/45/80, yaw0/1.1/3.5, readiness0/.5/1) plus density omission, suppression and maximum-distance fade. All30 original/pilot images are exact, GL0, errors[] and warning/error logs[]. Positive controls contain16,601–16,654 visible pixels at close readiness0 and8,302–8,329 at half readiness. The final three omission controls contain zero visible pixels, so this is not a blank-vs-blank-only test.

Scope: simplified single billboard and generated alpha-tested sRGB texture in a256² single-sample target with linear fog. Does not prove full-world visual acceptance, GPU speedup, packed uploads or restoration. Full-world timing and movement remain required; no adoption or PR yet. Ten directed Node tests pass including unchanged default/fragment/packing and previous alpha/submission/report regressions.
