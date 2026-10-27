# Harness failure before measurement

First baseline did not reach the menu: raw source override retained a bare Three.js import instead of the Vite-transformed URL. No runtime WASM was loaded, no performance evidence was collected. Preserve this run. The corrected harness reuses the transformed import from the server response; production sources are unchanged by this repair.
