# Native fifth-maize handler evidence

The official executable from b76cda99/run38020828966 was downloaded and matched against the artifact API digest. Its ordinary CI smoke failed readiness after90088.9ms at84%; that original failure remains retained. A local invocation with explicit --smoke-report, --smoke-visual and --smoke-visual-plant used a new isolated WebView2 profile and completed with no errors.

After the first actual canvas draw, the guarded diagnostic invoked the real diorama plantAt handler once using its current camera and raycaster. Four plants became five at the selected ground position; logical saved-game plant IDs remained unchanged. The existing renderer subsequently produced initial, additional-plant, intermediate, late and mature PNGs. Visual inspection of mature.png confirms all five maize plants remain visible and complete. This is synthetic engine-handler evidence, not physical mouse/touch acceptance. The plant was added at progress0; this does not provide native evidence of a plant catching up after being added at65%.

The five PNGs are saved under docs/qa/interactive-loading-development/native-b76-local-day/ as requested. They show the diorama canvas only and exclude the HTML loading interface. Different machines and PNG readback overhead prohibit interpreting the local17452.8ms readiness observation against CI as a causal speedup or GPU benchmark. Portrait, physical planting, first-frame night coherence through the real menu and the CI loading cause remain open.

Run python docs/qa/windows-loading-regression/visual-b76-native-plant-root/verify.py to check exact report/artifact/image bytes, original failure, local success and the five-plant evidence.
