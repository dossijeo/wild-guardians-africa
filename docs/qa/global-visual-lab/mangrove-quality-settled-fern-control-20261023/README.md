# Fern selection control for quality restoration

Same settled day/night protocol as ../mangrove-quality-settled-20261023/, with WG_QUALITY_HOLD_GROUND=1. Only for diagnosis, temporarily hold groundDetails.configureQuality while actual world/terrain/shadow quality changes normally. Restore the method afterward. This is not a proposed game setting or performance optimization.

Full-frame differences after returning to medium: day 1 and 7 pixels; night 4 and 3 pixels. Near/far fern counts stay 1181/700. Together with the ordinary quality run (5472 day / 4605-4606 night pixels, 1202/679 ferns), this attributes the meaningful residual image difference to fern LOD reselection. Tiny remaining pixels are not attributed; do not claim exact whole-frame identity. The approved density and LOD thresholds are unchanged.

See comparison.json, compact state snapshots and actual medium captures. The ten-frame measurement preambles are not benchmark evidence.
