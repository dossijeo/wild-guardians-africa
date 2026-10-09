# Normal Windows loading observation

Source: `fc66151fda9d09c9b62bcb1eb3a534c62970a4a5`.
[Original workflow37980008371](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37980008371)
is terminal failure. Artifact11640144534 is the original3131-byte
`desktop-smoke.json`; the archived bytes have SHA256
`e9bf200eeb9cfa846610b1081c1c414c113ea2f0fa5f0003b392f56a002ab0b3`.
Root rechecked the hash and decoded `checks.loadingAtFinish` on9October2026.

The ordinary packaged tester reports `Production world did not finish loading`.
Its unchanged readiness gate is false after90,136.2ms, with83% displayed,
`Preparing rendering resources`, stage busy and a visible/focused1028×720 canvas.
These are presentation observations, not identification of a specific stalled
operation or actual GL adapter. No hidden-test acceptance exists for this run.
Later diagnostic successes and local native successes do not replace this
negative. This archive changes no runtime, timeout or acceptance criterion.
