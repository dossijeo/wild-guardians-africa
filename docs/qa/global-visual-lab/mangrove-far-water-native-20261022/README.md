# Mangrove distant water joins the deep-blue direction

Retained the visible change from legacy cyan to muted blue in the far water uniform when natural shores are enabled for Mangroves. Near water, moss and sediment are unchanged. No new shader operations, texture fetches, geometry or draw calls introduced by the color edit.

Real full-background comparison: seed 712, medium, 1280x720, day/night, three views. The view exposing distant water has equal calls/triangles in both phases; 4426 daytime / 4428 nighttime pixels change. The four other images are RGB exact. Two daytime near-view draw-count records differ despite identical pixels, so this capture is NOT performance evidence. No GL/page errors. New capture waits for idle far adapters and 45 stable draws per pose. See audit.json and comparison images.

The far water remains a simplified, nonreflective proxy with fixed night grading; matching the base tone does not prove seamless moving transitions. Tree dithering and streaming/resource validation remain pending. DOF deferred.

Also fixed terrain revision in seam cache keys: previously an invalidation at unchanged bounds could reuse stale geometry. Added a failing-then-passing regression test; all 15 targeted seam/material tests pass.
