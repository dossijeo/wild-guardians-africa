# Local native loading comparison runner

`tools/run_native_loading_pair.ps1` prepares a controlled saved-world **A/B/B/A** comparison using one verified executable and one immutable fixture. A uses the original serial crop order; B selects only the complete World crop-pair overlap. Both collect the same bounded phase attribution. This is a loading-time diagnostic, not a GPU or physical-input benchmark.

Required parameters are `Executable`, `ExecutableSha256`, `Fixture`, `FixtureSha256` and a **new** `OutputDirectory`. Obtain the executable hash from its independently verified official artifact metadata. Use the legal fixture generator `tools/create_desktop_visibility_fixture.mjs`; preserve its output bytes and hash for all four passes. The executable must include the reviewed opt-in wiring from `28b681f3` or a subsequently verified equivalent.

The runner validates hashes before allocating output and again before each launch. It refuses an existing output directory or another active game process. Each pass uses a separate retained WebView2 profile and starts the owned executable hidden. It restores the previous profile environment variable on exit and only terminates its own process handle if cancellation or the original 900,000 ms fixture watchdog requires it.

The original 90-second world-readiness test and 300-second real native-hidden interval remain inside the executable's smoke fixture. Four successful passes therefore take over twenty minutes. No reduced visibility interval, fake asynchronous loading, asset omission, frame readback or simulation override is introduced by this runner.

The original native JSON reports are never rewritten. `receipt.json` records arguments, profiles, process IDs, report hashes, elapsed process time and world readiness time. A failed native report stops the sequence and remains failed. The runner requires native recipe selection **and** an actual `load-crop-pair-join` phase for B; A must have neither selection nor join. Renderer identity and world resolution must agree across passes, and attribution overflow is rejected.

Fresh application profiles do not reset OS, file-system or driver caches. AB/BA reduces simple ordering bias but four samples do not establish statistical significance. Total process duration includes hidden QA and must not be interpreted as world loading time. No GPU-pass timing, peak memory, touch acceptance or all-biome coverage is provided.

Validation so far: the PowerShell parser passes, and a deliberately wrong executable SHA is rejected before output allocation or process launch. **No native AB/BA sequence has been executed yet.** The official Windows trial `38024049488` is a separate single execution and does not replace this controlled local comparison.
