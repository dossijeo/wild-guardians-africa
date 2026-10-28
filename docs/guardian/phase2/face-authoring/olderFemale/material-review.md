# Older Amara: waxy material correction

The initial world-cycle-v10.mp4 is the **before** recording, not the accepted material. Its pronounced white face/arm streaks were confirmed visually. The original BakedMaterial uses an ORM texture with roughness reaching zero and nonzero metallic pixels. Merely replacing it with roughness .88 and metallic zero did not remove the streaks in WorldScene: the toon shader independently adds a strong specular band.

matte_worker_body.py changes only BakedMaterial: dielectric, roughness .88, preserved base color and normal maps. Its matteWorkerBody extra selects a scoped toon variant with 4% of the previous specular band. Tool/prop, oral and lid materials are unchanged; no global lighting change. The editable Blend and both candidate GLBs carry the correction. Normal-frame transfer was rerun and its receipt updated.

Compared separate continuous worker encounter recordings under the same fixture lighting and camera. glossy-world-before.png and matte-world.png are frames around 2.8 seconds (poses differ slightly due to realtime sampling). The broad white streaks on face and sleeves are removed in the latter. Albedo and normal image bytes, geometry, morphs, skin and animation binary payload are unchanged by the material operation; wrinkles have not been repainted or smoothed away.

The candidate remains uninstalled in the worker catalog. Daytime close-up material review, final packaging and installed-model verification remain pending. This night fixture does not certify every lighting condition or fine facial seams.
