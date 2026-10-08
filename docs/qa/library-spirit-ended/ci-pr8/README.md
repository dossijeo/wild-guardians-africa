# PR 8 integration evidence

Feature HEAD: `73dcab6a9ec58fc8e38d5cae6afffaa21c7f3e87`.
Merged into main as `f23b8c489d0a3c93ecbd830bb2be319e006d3d64` on
2026-10-08 at 23:01:55 UTC; root then pulled with `--ff-only`.
There is no diff between feature HEAD and the merge in `src`, `public`, or
`tests`; main's intervening commits contained camera evidence/documentation.

[Validate run 37855292636](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37855292636)
passed: 3272 tests, zero failures, build, asset/plan/balance/runtime checks and
web-package verification (702 files, 859 relative links, 20 runtime GLBs).
The complete public run log is retained as `validate.log.gz`.

[Windows run 37855292557](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37855292557)
passed on the same feature HEAD. Downloaded desktop smoke and visibility
reports are retained here; both report `ok: true` and empty error arrays.
Real native minimization lasted 300421.3 ms. Hidden snapshots match in all
21 captured simulation fields; restoration retained the menu pause before
simulation resumed for approximately one second. This fixture has one plant,
one worker and one centre, with active shield and raid; it is not dense-farm
or 100-night campaign evidence. The visibility comparison intentionally
excludes savedAt, notices, tutorial presentation and the nextId counter.

These CI reports do not replace native Biblioteca/voice interaction QA, audio
listening, physical mobile testing or GPU/frametime measurement. Those scopes
remain distinguished in the parent QA review.
