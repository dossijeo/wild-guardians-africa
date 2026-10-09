# Exact production-depth Windows executable: local New Game

The unmodified executable from [Windows37983985482](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37983985482),
source `8e1909d8ecd6d2455b7a52a97196e10455b9d834`, passes the original packaged
New Game tester locally. Artifact11642418681 is378,869,760 bytes, executable
SHA256 `241636f6a2f0c36830e79a381e8074fda2158dc8833d0c24a9b99622007e7539`.
It was downloaded directly; byte count, MZ/PE signature and hash were checked.

Only `--smoke-report` was passed. The fresh WebView2 profile was observed in
seven native child processes and the parent environment was restored. PID46548
exited0. The unaltered1,293,549-byte report records `ok:true`, no errors,
the original readiness gate true and stage busy false. Its recorded interval
from the original start-message boundary to the original stage-ready boundary
is18,419.5ms. This includes the intended loading/presentation transition; it
is not an isolated GPU benchmark or a controlled before/after improvement.
The27.9777182-second process lifetime also includes preflight and capture.

Root inspected `world-new.png`, extracted unchanged from that report: the
1024×576 very-low-quality Gran Cañón/Mapungubwe terrain, river and village are
rendered. This is the world canvas, not manual gameplay/HUD acceptance. No
actual GL adapter identity is present, so no adapter is inferred from OS data.

`desktop-smoke.json.gz` retains the original bytes. `receipt-new.json` pins
payload hashes, launch/exit and executable identity. The same workflow's
[normal CI failure](../windows-loading-regression/normal-8e1909d8/desktop-smoke.json)
at88%/90seconds remains negative. Local success does not approve CI or all
Windows machines, biomes/cultures or dense saves. Continue/native hiding is a
separate original test and is not accepted by this New Game report.
