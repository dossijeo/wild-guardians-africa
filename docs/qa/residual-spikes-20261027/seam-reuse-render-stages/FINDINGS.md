# Render-stage diagnostic

Optional qualityRenderStages instrumentation records existing generator stages and nested Three renderer calls >=1ms; 973 spans, zero dropped. This is one diagnostic, not an AB performance claim. CPU maximum 34.23 ms: draw 20.985 ms, nested Three world render 20.290 ms; sync/LOD 3.855 ms, far vegetation 3.675 ms, asset groups 2.555 ms. Other slow frames contain two world-render calls, consistent with the existing depth capture plus color path; classification by render target/override material is required before claiming redundant work.

The previous 47–62 ms maxima did not recur in this run. No optimization was applied. Do not claim improved performance from this difference. Continue identifying depth-pass demand and draw submissions before modifying their scheduling. Preserve visual effects and correct depth occlusion.
