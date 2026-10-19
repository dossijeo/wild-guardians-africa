# Six-biome visual review

Reviewed the six supplied mockups and the existing `../six-biome-reference/*.png` WorldScene captures. Those captures are baseline QA fixtures (1280 x 720, media, seed 712, time 150, visualLab disabled), not new shared-atlas captures or legal campaign runs. Camera, layout and lighting differences prevent pixel-for-pixel grading. The assessment concerns the visible result, not the person who produced it.

The technical foundation is useful: consistent low-poly geometry, reproducible real WebGL views, resource measurements and flags preserve comparisons. The artistic result remains substantially below the mockups. Surface detail is frequently uniform at the wrong scale; weak ground/plant grouping and flat water make environments feel less composed. More micrograin or sharpening will not bridge that gap. The workshop's roof and arch are a useful partial improvement, but their crispness exposes the unfinished neighbouring surfaces.

| Biome | Visible deficit | Highest-impact next controlled experiment |
|---|---|---|
| Savanna | Uniform fine ground fuzz, evenly scattered tufts and very green crowns. Mockup has warm clustered grass, quiet paths and grounded shadows. | Group medium-scale dry grass into irregular beds, clear walking areas and strengthen local contact shading. Compare identical camera before adding more detail. |
| Grand river | Busy ground carpet with sparse vegetation, flat cyan water. Mockup has layered green beds and clearer bank/depth transitions. | Reduce ground microcontrast, organize fern/grass patches around banks, test a depth-dependent water edge. |
| Mangrove | Uniform mossy island surfaces, repetitive distribution, hard cyan shorelines. Mockup depends on roots and irregular banks. | Test bank blending and water depth first. Root architecture is a geometry/layout difference and cannot be recovered through colour atlases alone. |
| Desert | Broad yellow ground and dominant long shadow, little directional surface structure. | Sparse wind-aligned ripples and sand accumulation near rocks, preserving quiet expanses. Avoid a full-field noisy sand carpet. |
| Volcanoes | Cold blue rock texture everywhere and fairly flat warm lava. Mockup separates quiet dark rock plates from selective hot fissures. | Test large low-contrast geological plates plus a few restrained emissive cracks and local warm light. Do not cover the entire ground in bright fissures. |
| Canyons | A huge foreground wall dominates the wider, higher QA view; regular high-contrast strata and flat cyan river. | Match the mockup camera/framing first, then test less regular stratification and bank/water depth. The obstructing wall is a fixture/camera issue as well as a landscape issue. |

A sensible next global priority is water/bank transitions followed by vegetation grouping and contact light. These changes should be evaluated in real gameplay views, including night, before increasing asset detail. No implementation or performance claim for these recommendations is included in this checkpoint.
