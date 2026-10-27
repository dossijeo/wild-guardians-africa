# Sabana initial combined benchmark: resource repeat check pending

Same native selected recipe/source056d5ce06, Intel UHD/D3D11,1280x720,seed712,populated saved opening,full backgrounds. Medium/low/medium/low,day/night,60warmup+90 GPU samples and separate cadence passes. Raw eight records retained.

Strict audit-biome-populated-resident-20261022.py fails medium day memory equality:344 versus345 resident geometries,111textures both. Day medium workload1229129triangles and night1257038triangles repeat exactly. This is not a completed strict resource-matched benchmark. No cache clearing or geometry reduction is used to force passing.

A follow-up allocation-aware runner records registered fade geometries and their nominal payload outside timing. Its audit requires identical visible fade descriptors, all other geometry counts, textures, state and actual draw workload; any resource difference must be wholly explained by those retained fade registrations. This follows the independently observed obstruction cache lifetime, rather than silently dropping the memory check. No result from that follow-up is claimed here before execution/audit.

Follow-up completed separately in ../sabana-allocation-aware-cost-20261022:720GPU samples passed and total resources matched344/111 medium,320/109 low. The old single-geometry variance did not recur and is not retroactively explained by that successful repeat. Keep this original strict failure intact.
