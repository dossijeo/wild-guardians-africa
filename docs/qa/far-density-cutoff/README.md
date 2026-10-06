# Sparse landscape and distance cutoff

The native Sabana adapter now owns configurable landscape parameters, applied to each newly prepared regional candidate before adoption:

- 100–140 m: native/model transition (unchanged).
- 140–180 m: faithful impostors with full procedural population.
- 180–280 m: deterministic density reduction using each tree's existing ID/seed rank; minimum density setting 0.08 with the existing soft rank band.
- 280–330 m: all surviving impostors fade to zero via the same screen-door coverage pattern.

The 400 m regional half extent retains a 64 m camera hysteresis margin around the cutoff. Configuration rejects reversed/overlapping ranges and cutoffs exceeding that margin. Rapid camera movement and slow regional preparation still need dedicated visual stress tests; this margin is not proof of an uninterrupted horizon at arbitrary camera speed.

The vertex shader computes the distance fade. Its default range is effectively disabled for older isolated fixtures. The native adapter enables the configured range. The fixture no longer overwrites density every frame, so every replacement region receives the same settings through the adapter. Logical/procedural trees and navigation remain unchanged.

The fragment shader performs the existing dither rejection before atlas sampling, avoiding color/phase interpolation work for rejected fragments. Alpha-test behavior remains after sampling. This changes the order of equivalent rejection conditions; hardware helper invocations and compiler behavior mean sample savings cannot be inferred directly from source code.

The native fixture loads 646 trees, 25 chunks, 18 prepared visible near trees, no errors and WebGL error 0. After a 96 m camera move it adopts region 2 and preserves the density/fade settings, again with no errors. Console capture is empty. Fifteen transform, native-only ownership, normal decoding and layer tests pass. The captures show stationary and moved views, not a proof of seamless transitions in every direction.

ABBA GPU measurement: 360 resolved samples, fixed camera/simulation, no hidden frames or additional native preparations. Baseline mean 23.543 ms; enabled mean 25.390 ms; difference +1.847 ms / 7.84%. Intel UHD Graphics via ANGLE, 1600 × 900 drawing buffer. The baseline keeps the same fog/resources but hides the additional far layer. Both concurrent CPU campaigns remain running.

The baseline lots themselves differ (24.330 ms versus 22.757 ms), so this trial does not establish an improvement over earlier runs or isolate the effect of early rejection from the new density, LOD2 atlas and ground night changes. Native draw distance has not been reduced. The feature remains disabled in normal gameplay and needs further performance and horizon-composition work, including the biome backdrop.
