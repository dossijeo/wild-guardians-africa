# Canyon mesh-boundary attenuation: rejected QA

Twelve real medium1280x720 captures, seed712, fixed day/night and three cameras, native full backgrounds. Baseline: ../reviewed-five-biomes-20261022/gran-canon-media-native-{day,night}. Candidate routes only natural-water-edges.js to remove the Canyon bypass of triangle-edge distance construction; production source unchanged. Geometry, core/rim material split and logical water unchanged. No recorded page/GL errors.

Visual rejection: native-day/0002 (inside gran-canon-media-native-day) exposes transverse dry stripes crossing the river. Edge counting by equal endpoint pairs cannot safely classify all joins in the strip-generated river mesh; unmatched/internal joins become false shorelines. The lateral sawtooth remains. Therefore do not promote this patch or interpret pixel changes as a gain. The existing Canyon exception must remain until a topology-aware alternative is proven.

No benchmark needed for adoption: candidate fails the visual requirement. It adds per-chunk edge/bin construction, with unchanged shader sample count; CPU cost was not measured. Next isolate depth-mask sampling rather than applying this generic boundary detector to Canyon.

Reproduce with server5190: node tools/experiments/capture-canyon-boundary-mask-20261022.mjs. Remove inherited WG_REVIEW_BIOMES/WG_REVIEW_OUT environment overrides first if using a shared shell.
