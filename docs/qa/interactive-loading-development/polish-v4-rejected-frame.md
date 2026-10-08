# V4 portrait frame rejected

Native fixture at feature9a05db14,390x844, actual progress40%. The FOV42 degrees achieved +21.5% projected linear presence against50 degrees at fixed depth, but the left plant was clipped and lowering sky coverage made the native cloud layer barely visible. This is negative evidence, not acceptance. The screenshot is preserved as rejected-v4-day-portrait-intermediate-real-loading.png with its original JSON.

Next candidate retains FOV42 degrees and model scales, raises presentation focus from0.65m to1.15m, and compacts only the four loading-scene initial positions into a naturally spaced arrangement with a narrower projected width. Real procedural world/save crops remain untouched. Native visual verification across growth, aspect and orbit extremes is still required.

## V5 merge regression

The first native V5 run exposed a duplicate cloneRuntimeMaterial import after merging independently adopted copies of the same helper. Directed GPU preparation tests did not import native-far-ground itself and therefore missed this syntax failure. Preserved rejected-v5-merge-import-failure.png/JSON. Fixed by deduplicating the import; native module syntax and a full build are required before restarting visual QA. This failed load is not performance or visual acceptance.
