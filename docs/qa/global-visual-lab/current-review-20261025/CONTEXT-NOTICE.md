# Remove obsolete context-loss notice after recovery

The resident-mask lifecycle screenshots exposed a persistent command-feedback banner saying the graphics context was lost and the game paused, after the context had recovered and its pause had already been removed. main.js now clears commandFeedback only when it still equals the context-loss message, then refreshes the existing feedback UI. A different/newer command error is preserved. Existing simulation pause/resume behavior is unchanged.

The first real Manglares repeat visually removed the banner but the new QA assertion failed: it searched document.body.textContent, which includes hidden retained banner contents. command-feedback.js intentionally retains the hidden banner for reuse. That failed verifier and its screenshots are preserved as manglares-context-notice-fixed.*. This is not evidence of a remaining visible warning.

The revised assertion examines rendered command-feedback elements (nonempty client rects and visible computed visibility). A separate repeat is recorded under manglares-context-notice-visible-check.*. The test performs four quality transitions and real forced WebGL loss/restoration with the fixed512 ground cache, ferns, resident mask, scheduler and pthreads. The scene stays paused to check world snapshot consistency. Existing compiler X4000 warnings are preserved; this change does not address them.

Final repeat passed: staleContextNotice=false, quality/context worldUnchanged=true, no unexpected logged errors. The after-context screenshot was inspected and contains no loss banner; the ground, localized mud, water and fern coverage remain present. This verifies the recovery notice in the tested paused Manglares case, not every application error path.
