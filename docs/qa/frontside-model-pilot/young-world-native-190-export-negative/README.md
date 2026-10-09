# Young World resources190 — export instrument failure

Root executed the resources/front/VFX-on recipe from4bb26a95 in one native
context. The terminal DOM reports `Unexpected report` after the actual POST,
with cleanup.closed/contextLost true/errors empty. Root retained this status,
console and PNG before closing the tab. No native report body was retained here;
do not invent buffer counts, resource gates or CPU witnesses from the screenshot.
No resource approval, timing, model or category approval follows from this run.
ANGLE environment warnings and Texture Unable to serialize warnings remain in
the console artifact; cleanup errors[] does not mean console empty.

Source inspection identified a transport defect: the initial native POST status
whitelist omitted `WORLD_DENSE_YOUNG_MAIZE_GPU_NOT_APPROVED`. The specific young
validator/prefix already existed. Earlier HTTP preflight exercised that later
validator while skipping the initial guard, so its PASS did not cover the whole
native transport. The fix shares the status guard between preflight and POST;
it retains experiment-specific payload/identity validation and visual policy3.
It changes no model, shader, geometry, resource budget or timing schedule.

Run `node docs/qa/frontside-model-pilot/young-world-native-190-export-negative/verify.mjs`
to check retained file hashes, complete PNG and failure/cleanup status. A new
reserved native resources execution is required before any timing.
