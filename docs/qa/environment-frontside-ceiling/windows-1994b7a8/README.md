# Native Windows evidence after environment FrontSide activation

Run [37901173610](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37901173610)
completed successfully on immutable source `1994b7a8c5cc1be9b4328b2db67233f84b8dc703`.
Root inspected its completed build, executable/installer, packaged WebView2
smoke and genuine native minimization/restoration steps. Executable and
installer artifacts are present in that run; they were not downloaded here.

The two original report payloads are retained byte-for-byte: artifacts
11603845710 (`desktop-smoke.json`) and 11603711022 (`desktop-visibility.json`).
They are native single-file artifacts, not ZIPs. The CLI ZIP extraction failed;
root retrieved the original payloads from the GitHub artifact API and parsed
them as JSON. Their sizes/hashes are independently checked by `python verify.py`.

Both reports have `ok:true`, no recorded errors, WebGL2, worker and storage
checks, and a Gran Cañón/Mapungubwe rendered world. Root independently compares
all 21 retained simulation fields before/after 300.650 seconds of native hiding:
they are unchanged. The menu blocker remains on restoration; subsequent
unpaused simulation advances approximately one second. These reports deliberately
exclude notice/tutorial presentation counters from that equality check.

This is Windows packaged-runtime evidence, not a new six-biome GPU comparison,
audible audio acceptance, physical web/mobile hidden-tab acceptance or validation
of the separate V4 crop/loading branches. Later main changes through `67fd85b2`
touch only documentation; the run still retains its actual source identity.
