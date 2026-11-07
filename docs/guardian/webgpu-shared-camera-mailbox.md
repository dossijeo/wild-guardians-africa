# Camera updates for the graphical Worker

When the page is cross-origin isolated, the presentation client sends a shared,
single-writer camera mailbox to the graphical Worker at startup. Input publishes
the latest pose and version without waiting for an acknowledgement. The Worker
reads a consistent sample before a frame or an interaction; an in-progress write
is skipped and retried at the next boundary. Rendered-frame and picking versions
still reject results associated with an older camera. No simulation authority is
transferred to the graphics Worker.

The mailbox requires SharedArrayBuffer and cross-origin isolation (including the
appropriate deployment headers). Otherwise the existing bounded, acknowledged
camera channel remains in use; it retains only the latest pending pose. A new
presentation client creates a fresh mailbox during recovery.

The contract is covered by `tests/shared-camera-mailbox.test.js`,
`tests/webgpu-world-client.test.js` and `tests/webgpu-world-held-frame.test.js`,
including a real Worker sharing memory and the actual graphical Worker entry
point with a mocked surface. This does not establish browser frame latency or
prove that a deployment enables cross-origin isolation.
