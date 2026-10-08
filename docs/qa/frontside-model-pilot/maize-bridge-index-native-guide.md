# Original bridge DoubleSide native control

This is a new isolated two-arm fixture, not a repaired asset. Both arms retain the native crop materials, source regional metadata, live instance bindings and DoubleSide colour/shadow recipes. The sole change is the original maíz 3→4 bridge's index stream. No reverse faces, geometry simplification or camera-selected surfaces are added.

The runtime helper restores the original geometry before releasing candidate-owned buffers, detaches exact-reference borrowed attributes first, and lets the native batch dispose its source resources afterward. It follows the original crop batch's sampler and updates for both arms. Static storage reports are CPU arrays, not measured GPU memory or vertex invocations.

Open `http://127.0.0.1:5284/tests/browser/frontside-bridge-index-control.html?caseIndex=0` only in a reserved native GPU window. The page creates no WebGL context until the Run button is clicked. Case 0 is prospective TRAINING at growth .7325, Sabana day, clock 1.75, azimuth 26.25/elevation 32.5. Cases 1–3 cover night and early/late source transition points; they are named in the fixed case module. They do not select geometry.

Wait for prepared status and enabled Run, click once, then wait for saved/GPU-released terminal. Preserve the exact raw report and two-arm PNG immediately from `crop-bridge-index-double-selection.json` and `crop-bridge-index-double-last-frame.png` before another run. Close the tab and confirm the inventory. Do not retry an observed failure merely to obtain a favourable result.

The report verifies that both actual target bridges are visible with one instance in morph phase, reports the original/indexed CPU geometry layout and unchanged material/depth/instance ownership, and records native draw counters and effective shadow submissions. Three source redraws and original/indexed readback byte differences are diagnostic only under policy 3. Human review remains pending even for bit-exact images, and no GPU timing, shadowFront, whole-World or crop category approval follows.

The private report route validates the fixed original/web-source mapping, source byte hashes, case, DoubleSide arms, live source binding and cleanup, with a separate artifact prefix. No visual difference threshold is used as transport or acceptance rejection. Rejected requests retain a separate instrument report.

Before native capture, `node tools/frontside_bridge_index_preflight.mjs` checks served models/mapping, the actual 13,626,668-byte runtime GLB hash, the 278,481-byte bridge metadata hash, and the export endpoint without WebGL or visual artifact writes. Its runtime/cleanup placeholders are explicitly marked and prohibited from the native report route. The CPU receipt is `maize-bridge-index-export-preflight.json`.

The first CPU preflight detected incorrect concatenation of a relative manifest URL onto the server origin, before any renderer was created. The tool and browser's manual byte fetch now resolve the fixed runtime path from the server root. The subsequent CPU preflight passed in .474 seconds. This corrected instrument error is not a model rejection and was not hidden by rerunning native samples.

Five directed source/transport contracts passed (command .404 seconds, TAP .152 seconds). They cover ownership/restoration, rejection of altered source sidedness/identity or claimed human approval, acceptance of diagnostic image differences, and exclusion of placeholder preflight reports from native artifacts. Syntax and the immutable 880 functional report verifier also passed. Native rendering of this new control is still pending.
