# Current web validation and unchanged Windows loading baseline

Web run38016098976 on main3df49f29 is terminal success:3792/3792 tests,
asset/audio/plan/balance/browser checks, build and direct itch package pass.
The official itch artifact has388367056 bytes and the same SHA256
`f26f55d1ff057e906e0a19ae7192ef85a40ff0e6bdf1d38e69fc65e21f925ceb`
as the [independently downloaded and CRC-verified earlier blob](../validate-main-38013118033/README.md).
No repeat download or actual itch publication is claimed. The originals here
retain API metadata and the complete log, rather than just a green badge.

Normal Windows run38015626895 on9f0f65ed is terminal failure. EXE and installer
builds pass, all22 model preflight checks complete, but world readiness remains
false after90086.7ms. The84% label “Awakening nature...” is presentation evidence,
not a compiler/resource timeline or an isolated bottleneck. Native minimization
is skipped. Root downloaded the3121-byte official report11656881732 and matched
its digest against API metadata. The complete log and receipt are retained.

Only evidence differs between these two main commits; no loading runtime was
changed. Neither this negative baseline nor the web success approves the
final deduplicated crop partition candidate, which remains under development.
The separate [isolated positive trial](../windows-loading-regression/partition-4b-38014169890-root/README.md)
remains candidate-specific evidence.

Run `python docs/qa/ci-main-3df49f29/verify.py` to check original log hashes,
report bytes/API digest, test totals, package identity and native conclusions.
