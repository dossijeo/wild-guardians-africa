# Native provider attribution and packaging candidate

Run37938283679 failed the unchanged90s production-world readiness check. It remained visible and focused at85%, in world compilation. No hidden-RAF explanation is supported.

The existing22 model preflight requests run before World rendering. Maize14,308,628B took8,474.8ms to headers,346.4ms body collection and18.2ms legacy decode. Bridges26,536,168B took19,455.5ms to headers,367.6ms body collection and78ms legacy decode. During loading bridges ResourceTiming reports11,964.6ms request duration; the GLTF awaited load is13,024.7ms, with60.5ms parse. These timings include native dispatch and processing; they do not isolate physical disk/network or CPU. Legacy decode and GLTF parse are different operations, and request order/cache conditions differ.

[Tauri2.12.1 defaults](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/Cargo.toml) enable compression. [EmbeddedAssets.get](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri-utils/src/assets.rs) invokes BrotliDecompress for each compressed asset request; without compression it returns borrowed embedded bytes. This is a candidate explanation, not a measured cause.

The next candidate disables only this packaging feature, retaining the other default native features. All assets, web code, model checks, shader readiness, cancellation and original90s smokes remain. EXE/installer size may increase. Both original native smokes must pass before promotion. The prior concurrent-readiness experiment remains off.
