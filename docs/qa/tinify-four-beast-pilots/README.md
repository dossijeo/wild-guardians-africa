# Four remaining beast color candidates

Actual Tinify pilots were executed sequentially for hyena, buffalo, lion and
rhino image 1 from their original embedded images, at unchanged runtime
resolution. No distributed model, recipe or asset manifest was modified.
The four ignored candidate GLBs are not accepted runtime assets yet.

| Species | Potential GLB bytes saved | PSNR against resized original |
| --- | ---: | ---: |
| Hyena | 264,660 | 37.1475 dB |
| Buffalo | 241,576 | 38.1388 dB |
| Lion | 463,764 | 35.0427 dB |
| Rhino | 478,448 | 34.6418 dB |

Total potential saving: **1,448,448 bytes**. Every candidate passed the independent
decoded gate: original geometry/animation metadata preserved, non-color images
byte-exact, alpha unchanged, PSNR above the existing 32 dB gate and no new decoded
conformance errors. Full inherited errors and source/output hashes are retained
in each species report. The lower lion/rhino scores warrant close native visual
review; passing a numerical gate is not enough to accept them.

## Reproduction and review

Each report identifies the exact manifest-owned runtime path and image index.
Run `tools/optimize_embedded_image_pilot.mjs` with those two arguments and a
privately configured `TINIFY_API_KEY`. The existing cache avoids duplicate
uploads of identical original-derived inputs. Candidates remain under ignored
`.cache/tinify-embedded-pilot/<original-image-hash>-1/`; credentials and private
provider response locations are not part of these reports.

The browser fixture now supports all five beast species with an explicitly
selected local pilot:

```text
/tests/browser/embedded-color-pilot.html?species=hyena&pilot=092d68e172b85f8f54433ed4af61aeb09bdda4020e213764160d5c3da6730734-1
```

Use `summary.json` for each species/pilot key. The fixture validates the selected
species, restricts the local key format, checks receipt/model correspondence and
verifies both model hashes before rendering. It fits the new species to the same
camera for its baseline/candidate pair. The old facóquero framing is retained.
Its script passes syntax checking; no native run of these four new selections is
claimed at this checkpoint.

Next: inspect baseline/candidate close views in day/night, preserve native reports
and console warnings, then accept only adequate variants through offline recipes
and asset/build/package checks. No reduction in RAM/GPU/frametime is claimed.
