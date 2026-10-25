# Development Library validation

Source e74b79b1d, Vite localhost:5190, real headless Chrome.

Command: WG_QA_BROWSER_CHANNEL=chrome node tools/check-post-jam-library-browser.mjs http://localhost:5190 docs/qa/production-integration-20261025/final-library-development

All sixteen cases pass: crops, walls, destruction and SFX at 1280x720, 844x390, 390x844 and 360x640. Original report and screenshots are retained alongside this note. Crop selection and eight-plant demo, stone wall selection and editing modes, 50% destruction/reset, sound filtering/playback/volume and return navigation were exercised. No page errors recorded. This is functional/UI evidence, not a performance benchmark; the native build was running concurrently.

This covers the four linked Library demonstrations in development. It does not claim validation of every archived internal experimental route, all native flows, or final merge readiness.
