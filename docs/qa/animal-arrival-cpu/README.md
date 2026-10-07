# Native actor arrival CPU diagnosis

Actual browser tab 656 ran the production WorldScene in Gran Cañón, medium
quality, seed 712 and Mapungubwe, with a paid center and controlled five-species
spawn from prepared reserves. Source base is `7994178`, with the QA-only
`actor-profile=1` probe added to the existing fixture. No production behavior
was changed. The tab was closed after saving the report, console and screenshot.

The report passes the fixture's resource/ownership checks: all five species were
ready, each used its warmed spare, model downloads stayed 7 before/after, no new
animal shader programs and no rig creations occurred during appearance. Console
errors and warnings are empty for this run.

The synchronous animated bounding-sphere recalculations at actor installation
still visit 126,156 vertices across five meshes. Their measured durations were
17.2, 11.7, 14.5, 11.2 and 11.1 ms: **65.7 ms combined synchronous CPU calls**.
Each actor installation elapsed about 88 ms, but those async intervals overlap
and include scheduling; they must not be summed or called exclusive CPU time.
The controlled logical spawn itself took 2.5 ms.

This is one desktop-browser diagnosis with two long CPU campaign processes in
the background. It does not establish GPU cost, repeatable FPS, mobile behavior
or an exclusive cause of the first-incursion hitch. It identifies actual CPU
work that remains after model/shader/rig preloading. A conservative cheaper skin
envelope is worth investigating, while preserving correct culling for every
animation and transformed/offscreen actors; no such production change is made
at this checkpoint.

The probe intercepts native actor installation and SkinnedMesh sphere calls only
when explicitly requested with timing enabled, preserves values/errors, and
restores hooks after capture, failure or page exit. Syntax checks pass for the
helper and fixture. The PNG/JPEG scene can show overlapping or offscreen spawn
members; the readiness result is not a claim that all five are visible at once.
