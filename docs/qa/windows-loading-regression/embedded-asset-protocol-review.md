# Windows embedded-asset delivery: source review

Reviewed 2026-10-10 against main `2df29fca`. This is source evidence, not a performance measurement or a runtime change.

## Local configuration

`src-tauri/Cargo.lock` pins Tauri 2.12.1 and tauri-utils 2.10.1. The application dependency retains default features; `frontendDist` is the local `../dist` directory. The application uses the standard builder, with no custom resource-delivery cache. Review does not inspect or modify unrelated browser fixtures.

## Version-matched upstream behavior

- [Tauri Cargo.toml](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/Cargo.toml): default features include compression, forwarded to tauri-utils and tauri-macros.
- [EmbeddedAssets](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri-utils/src/assets.rs): with compression enabled, each `get` expands the embedded bytes using Brotli into an owned buffer. This method has no retained decompressed cache. The same tag declares utils version 2.10.1.
- [AppManager::get_asset](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/src/manager/mod.rs): resolves the embedded resource and supplies its complete owned bytes and MIME type.
- [Release protocol response](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/src/protocol/tauri.rs): an async task obtains that asset, then responds with its body. This release path does not explicitly set Cache-Control or ETag. The response-cache code in that source is conditional on development/mobile and does not establish a Windows release cache. These observations do not establish whether WebView2 or another layer caches responses.

## Interpretation of the existing diagnostic

The original `native-f92c6872` report separates a resource response-end boundary from subsequent GLTF completion. In a packaged Windows application, the first interval can include local protocol scheduling, embedded-resource expansion and delivery. Its ResourceTiming classification cannot establish Internet traffic, disk latency or exclusive decompression CPU time. Likewise the subsequent interval combines parsing, decoding and callback work; it is not a parser-only benchmark.

The report therefore does not justify changing assets, adding a Rust cache or disabling compression. No expected time saving is claimed.

## Separate future experiment, if warranted

Keep the strict two-batch shader-readiness candidate isolated. After its frozen-source review and native comparison, reconsider delivery only if the measured critical path still warrants it. A delivery experiment would first need bounded native timing around resource resolution/expansion/response, matching resource identity and byte counts, and cold/repeated-load evidence. Any retained decompressed cache would also require peak-memory and cancellation/lifecycle assessment. Preserve the original 90-second readiness gate, assets, material variants and GPU fences; do not combine a delivery change with the shader-window experiment.
