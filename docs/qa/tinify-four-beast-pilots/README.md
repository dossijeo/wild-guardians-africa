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
Its script passes syntax checking. The subsequent partial native hyena review is
archived in `native/hyena/`; the other three selections still await native review.

## Partial native hyena review

Eight actual 1280 x 720 browser JPEG captures preserve the baseline/candidate
pairs in day/night, from the initial and opposite camera views. The final camera
fit uses 1.95 times the animated bounding dimensions so the header does not hide
the crest. Both variants use the same framing, frozen Walking .55 pose, production
toon material and fixed world light. Inspection found no obvious loss of face,
fur, spots or ornament detail at this framing; the lossy output is not identical.

`native/hyena/front-comparison.json` is a terminal 12-row comparison, covering six
biome uniform configurations in day/night, with no GL or recorded fixture errors.
These are palette configurations on a flat QA floor, not six complete biome scenes.
Full-frame pixel differences include background and cannot establish texture-only
quality or gameplay performance.

The opposite-view screenshots were saved, but its terminal numeric report and
console log were not archived before temporary tab 651 closed. Those checks must
be repeated. Attempts to open a replacement tab failed to attach the browser
webview; the tab inventory was empty and the local server remained listening.
No inferred back-view pass or empty-console claim is made. The file hashes and
fixture hash are recorded in `native/hyena/provenance.json`; module syntax was
independently checked after the opposite-view and framing edits.

None of these four candidate models is installed yet. Remaining native evidence
and the offline rebuild/build/package gates are required before adoption.

## Completed native follow-up

The browser recovered. Hyena's opposite-view run was repeated in tab 652 and its
terminal report and console were saved. Buffalo (653), lion (654) and rhino (655)
were then reviewed from both views, in day/night. All 32 native JPEGs were
inspected: no obvious deterioration of fur, markings, face or ornaments was found
at this documented framing. All eight terminal reports contain 12 finite paired
readbacks at 1280 x 720, with no GL or fixture errors: 96 comparisons in total.
Their differences are real lossy differences, not pixel equality. The summary
and per-species provenance preserve exact model hashes and capture hashes.

The repeated hyena run uses the fixture source from `2ebe7f3`; the other three
use the subsequent viewport guard. A background buffalo tab initially reported
a zero-sized target before comparison. That run was discarded. The fixture now
waits for a usable viewport before fitting the camera, resizes renderer/target
together and rejects empty comparisons. The three later species were tested at
an explicit 1280 x 720 override, reset after closing all test tabs. No resize or
empty-target readback is accepted as successful evidence.

The saved console logs contain no errors; hyena's first tab console remains
unavailable, and its log covers the repeated back run only. The remaining three
logs cover both views. These results approve the four color outputs for the
offline recipe stage. Actual runtime installation and build/package verification
remain separate and are not claimed by this native checkpoint.

Next: inspect baseline/candidate close views in day/night, preserve native reports
and console warnings, then accept only adequate variants through offline recipes
and asset/build/package checks. No reduction in RAM/GPU/frametime is claimed.
