# Windows packaged smoke on local Intel UHD

The executable from run [37965522528](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37965522528), source `6a798f72`, passed the original primary product smoke locally. Its CI report remains a failure at the unchanged 90-second world-loading gate.

Local report: `ok:true`, no errors, world-loading observation 27.030 seconds, loading overlay removed and stage no longer busy. The actual World context reports ANGLE Intel UHD `0x9A60`, Direct3D11, parallel compilation supported and no context loss. The canvas screenshot was extracted and inspected: canyon terrain, river and Mapungubwe buildings are rendered. This is a fresh game at the smoke's very-low quality, 1024×576 canvas; CI used 1028×720.

The original executable was downloaded without modification and its SHA-256 is in `receipt.json`. It was launched with the existing product `--smoke-report` and `--smoke-pause-menu` arguments, shared ground OFF. `WEBVIEW2_USER_DATA_FOLDER` was set only for this child process to a separate QA directory, then restored in the launching shell. The expected EBWebView directory and WebView child processes using that directory were observed. The product process subsequently exited; its numeric exit code was not captured, so none is claimed.

CI's actual context reported ANGLE Microsoft Basic Render Driver `0x8C`, Direct3D11. Microsoft documents this adapter in its [DXGI overview](https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/d3d10-graphics-programming-guide-dxgi) and the [WARP software rasterizer](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-devices-create-warp). The [WebView2 environment reference](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/webview2-idl) documents the user-data-folder override. Hardware, viewport and execution environment differ: the two outcomes are compatibility evidence, not a controlled performance comparison or proof of a unique cause.

`desktop-smoke.json.gz` preserves the complete local report byte-for-byte, including its embedded world screenshot. Raw and compressed hashes are recorded. No executable or WebView profile is committed.

This proves one local packaged loading case. It does not establish exact current-main binary acceptance, all biomes/cultures, continued or dense saves, normal-quality behavior, physical input/audio, minimization/restoration, or absence of performance regressions. It does not approve the shader candidate or replace the CI failure. The next CI paired experiment remains independent.

## Subsequent continued-game and visibility case

The same unmodified executable subsequently passed the original native visibility smoke with the paid seed-712 Canyon/Mapungubwe fixture generated from main `22b657f4`. Shared ground remained OFF and menu pause was ON. A separate `visibility-profile` WebView2 folder was used; seven child processes were observed using that folder. The product exited with code 0. Its report has `ok:true`, no errors, and genuine minimization/restoration passed.

The hidden interval was 300,938.1 ms. All 21 recorded simulation fields were identical before and after it. Restoration retained the menu pause; subsequent unpaused simulation advanced 2.0286 seconds. The context again reports Intel UHD Direct3D11 with no context loss. `desktop-visibility.json.gz` preserves the full original report byte-for-byte; hashes, fixture identity, process result and scope are in `visibility-receipt.json`.

The report's `productionLoading.elapsedMs` includes the five-minute visibility exercise and is not a world-loading duration. `worldReadyAt` is a page-clock timestamp, also not a duration. This proves one local continued-game and visibility case, not shared-ground-ON acceptance, exact-current-main binary acceptance, all biomes/cultures, dense farms, physical gameplay/audio, or a controlled timing advantage over CI. The native CI fixture still failed before minimization and remains an independent unresolved result.
