# Independent 21-night validation

These two seeds and biomes were not used in the Phase-2 seven- or fourteen-night genome screens. The two arms share all `DEFAULT_GENES` and current agricultural magic. They differ only in whether the virtual player builds and repairs walls; Shield remains enabled for both. Production balance and native simulation rules remain unchanged.

The competitive activity floor of 82⅙ delivered boxes per terminal day is frozen **before** these runs. It is the interpolated lower quartile of the six terminal three-night rates in the development pilot (`post-intro-pilot-14`, source `401f2d00ef6b9806e210c245798cf7ae9818a7bf`): 71, 78⅓, 93⅔, 104, 107⅔ and 119⅓. Paid wages, seeds and repairs required about 81.1–85.5 terminal boxes/day to break even in the two no-wall development arms. The floor is an evaluation convention, not a game rule; report raw delivery and native results even if a case falls below it. A native defeat remains a native defeat regardless of eligibility.

The runner records source/module hashes, compressed full reports, daily progress and cost stops. A stop after more than 60 seconds of `Game.tick` on one day or 15 minutes elapsed per case is a **technical computational stop**, never a simulated defeat. Results of 21 nights cannot establish a viable 100-night strategy; they determine whether longer testing is warranted.
