# Root review of serial-image-chain smoke wiring

Frozen candidate: `93d584ef605bab0f7144ee9c1c0629df873489fd`, based on the
previously reviewed preparation candidate `37427276`. Review date: 10 October 2026.

Root inspected the App selection, Rust smoke-only argument guard, explicit
reported recipe and both workflow invocations. The option defaults to false and
requires both smoke ownership and a boolean opt-in. Ordinary gameplay does not
read the experimental flag. Preparation, asset loaders, compiler and GPU budget
remain unchanged from the reviewed candidate. Original readiness (90 seconds),
hidden fixture (300000 ms) and host visibility timeout (900000 ms) remain intact.

The wiring receipt verifier passed independently. Root also ran the ten directed
test files listed in that receipt: 68 passed, zero failed/skipped/cancelled,
1419.7859 ms. This verifies CPU contracts and wiring, not native readiness or
GPU performance. The producer's build and package receipts are preserved on the
candidate branch; root did not repeat those checks.

One exact-source Windows trial is authorized with `serial_image_chain=true` and
`wall_buffer_package=false`, `compile_window=false`, `resource_overlap=false`.
No automatic retry, combined recipe, production promotion or relaxed gate is
authorized. The run identifier and terminal evidence must be preserved separately
before interpreting performance. The theoretical image-tail opportunity remains
unmeasured; nested loading spans must not be added as independent durations.
