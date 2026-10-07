# HQ mountain arcs: native Sabana pilot review

Root review of the agent's branch, Mapungubwe / seed 712 / media. One occupied
atlas cell only; three cells are empty. This is a diagnostic silhouette, not a
complete 360° landscape or an accepted runtime asset. Production backgrounds
on main are unchanged. Original generated sources and prior failures remain
in the agent branch.

The isolated imagegen v3 silhouette uses a 2048×512 atlas, 960×240 usable cell
with padding, a cylindrical arc at radius 430 and height 110. Its approximately
58.63° arc preserves the 4:1 physical aspect instead of stretching a panorama
over a much wider cylinder. The pilot avoids the previous mirror symmetry.
The tested atlas (207,264 bytes) and layout are preserved here for diagnosis;
this directory is outside `public` and does not add game payload.

On initial arc revision `42dd59fb`, two separate rotation receipts contain 73
day poses and 73 night poses (5° steps through 360°). Each has zero recorded
GL/JS errors and unchanged logical state. Only selected views were inspected
visually, not every frame. Day rotation follows a 20 m camera displacement;
night rotation uses the original eye. The dusk PNG is an observed view, but
its original exported receipt is a stale copy of the day rotation: it is
preserved as negative harness evidence, **not 73 dusk poses**. The agent fixed
export invalidation before the later comparisons.

The initial arc has improved relief/proportions and no obvious chromatic
fringe in the inspected views, but its base is sharply separated from the
grey horizon. At revision `d8d81aa3`, root compared two alternatives with the
same eye, orientation, atlas and quality:

- `arc-base-fog=1`: uses the existing base fog mix, preserves hillside mass
  and improves contact with the horizon in the inspected day/night views.
- `arc-shift=-30`: moves the same arc down 30 m. Most foothills disappear,
  leaving a visibly truncated peak; rejected as the composition direction.

Prefer the first direction for the next four-silhouette Sabana composition.
These alternatives have single current-state snapshots, **not rotation or
logical-state-invariance receipts**. Both report 54 calls / 685,171 triangles
and one texture sampler, but those counters do not establish equal GPU time
or memory usage. The harness loads an extra original texture for comparison;
Three resource counts are not driver RAM measurements.

Remaining gates: four distinct populated cells, alpha/mip isolation between
them, natural full 360° composition with broad valleys, slow motion and camera
heights, ground/river continuity, remaining five biomes, lighting, runtime
integration, GPU cost and mobile acceptance. No HQ PR has been accepted or
merged. This review chooses the next experiment; it does not close those gates.

The receipt binds raw/stored hashes, reviewed source hashes and each snapshot's
actual parameters. PNGs are native browser screenshots; no image cleanup was
applied to hide defects.
