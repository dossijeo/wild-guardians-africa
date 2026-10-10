# Independent root review

Root observed terminal failure of run38007229019/job114078703428 and fetched
official artifact11651569958 independently. All45,898 bytes match the frozen
`98edab86` archive, SHA256
0079ad30b480161eda533a8a03bd9ed104e3946adbb96f1d73b214b35693cf8f.
Archive verifier PASS; this verifies preservation of a failure, not readiness.

The CLI's ZIP extraction failed because this artifact is direct JSON.
Root retrieved the authenticated API redirect and then downloaded the signed
payload without forwarding authorization. The original bytes are preserved;
no JSON reserialization substitutes for the report.

The package recipe was enabled, the walls milestone completed, and no
transfers remained. These facts support that loading advanced beyond walls.
Completed non-GLTF transfer rows are absent, so the native report does not
independently time or trace the single package request. CPU tests prove that
loader's data equivalence and request count. The83 aggregate transfer count
is consistent with the159-request reduction, not a controlled speed result.

The unchanged90-second readiness gate failed at90.2359s/85%. Original serial
compilation had ten jobs started/nine completed; the active program19 had
only91.9ms observed readiness age. Do not call it a prolonged shader stall.
Different object/batch counts and early delivery timings between runs prevent
attributing total elapsed changes to packaging. Build success and preserved
logs do not override the failed gate or skipped minimization test.

No promotion, automatic retry, original-asset removal or combined experimental
recipe is approved. Any next candidate needs a distinct source-based proposal
and frozen validation before another native measurement.
