# Sabana: simple vs native far-ground recipe, identical pose

Source `4276339`. Seed 712, medium, Mapungubwe, 120–160 m transition and 30–300 m fog. `Mirar horizonte` was invoked once in each separately loaded scene, then explicit day/night was selected. Camera and target arrays match exactly across all four reports; night values are 0/0/1/1, errors and GL zero.

The two recipes look similar in this pose and the broad background remains. This does **not** yet establish that the band originates in ground shading; terrain occlusion, backdrop and fog composition remain possible contributors. The pictures retain visible dither on the large tree. No art acceptance, pixel-equivalence or performance claim.

The previously named `Aislar fondo decorativo` control only hid ground geometry carrying `aFarWater`, so it did not hide the simple recipe. It was not used for these captures. The new QA control identifies ground explicitly in both recipes, preserves the backdrop/trees/water and is labelled `Ocultar suelo lejano`. Shader, transforms and normal gameplay are unchanged by this instrument correction.
