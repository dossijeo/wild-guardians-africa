# Combined five-biome review in progress

Capture process uses globalReviewedQuery, seed712, medium1280x720, full native far impostors and mountain backgrounds. Do not interpret partial captures.json as completion of all five biomes. Each completed biome has warmup and native day/night, three recorded views.

Initial visual inspection: Sabana native day reverse (0002) preserves warm dry-grass coverage, tree shadow contrast and blue water. The surface reads as continuous grass in the foreground; the distance becomes noticeably simpler. This is one static view, not a whole-biome approval. Remaining native views and other biomes require inspection.

Separate Mangrove review: ../reviewed-profile-20261022. Far ground configuration uses groundStep32/colorStep4; its coarse representation is a hypothesis for foreground/background detail disparity, not a demonstrated defect or permission to increase mesh cost blindly.

Gran Rio native day reverse inspected: dense green coverage, visible tree shadow contrast and distinct water/soil margin. This camera alone does not certify shore variety or temporal LOD.

Source follow-up corrects the initial far-map hypothesis: native-far-ground.js uses colorMap alpha as the water mask in the active mapped/nativeWaterMask route. Terrestrial shading attaches BiomeGround with mapped:false, disables uGroundMicro/uGroundRelief, and uses an AfricanToon instance with uFineNoise/uGroundDetail zero. GroundStep32 also affects geometric slopes. Do not attribute terrestrial flatness to colorStep4 alone. A future QA should isolate distance-faded material detail before increasing geometry; measure aliasing and GPU cost.
