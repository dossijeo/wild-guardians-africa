# Exact main Windows executable — local startup PASS

The unmodified executable from [run37973100578](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37973100578),
source `2a910b83c34517a91ae870e83ad555f436e5d64f`, passed the original product
smoke locally. Artifact11639100640 contains378,868,736 bytes; its SHA256 is
`4dfcc6aa63ee4cce80780a8018a873b562d2c95b25d2eb682790f3d14affe99f`.
The executable was downloaded directly, without rebuilding or patching.

Only `--smoke-report` was passed. No experimental flags were enabled. An isolated
WebView2 user-data folder was inherited by seven observed WebView2 processes;
the parent environment variable was restored immediately after launching.
The game process40344 exited with code0. Its original report records `ok:true`
and no errors. The existing90-second stage-ready gate passed; the original
tester then captured the1024×576 Gran Cañón/Mapungubwe world in very-low quality.
The captured terrain, river and buildings were visually inspected. This is the
world canvas, not a screenshot of the HUD or a manual gameplay acceptance.

Process lifetime was28.038 seconds, including native startup and the tester's
asset/audio/menu checks and final capture. The report does not measure world
initialization separately; do not present this as a28-second loading benchmark.
A separate campaign CPU process remained active during the test. OS inventory
reports Intel UHD Graphics driver32.0.101.6881; this executable's report has no
GL renderer identity, so that inventory does not prove the selected GL adapter.

The same run's CI smoke failed with `Production world did not finish loading`.
Its original report is retained as `ci-desktop-smoke.json`. This local PASS proves
startup for this executable and environment; it does not establish the cause of
the CI failure, approve CI, or validate all Windows devices.

`desktop-smoke.json.gz` retains the complete original local report byte-for-byte,
including its PNG; `world.png` is that same capture. `receipt.json` pins the
source, artifact, executable/report hashes, launch arguments, profile and process
exit. No executable or user save is committed here.

Continue/save restoration, real minimization, all biomes/cultures, dense farms,
physical input, perceptual audio and mobile acceptance are outside this run.
The earlier diagnostic-branch local tests remain separate evidence.
