# Retained day-12 CPU cost, before any further campaign changes

The stopped V4 good-management Sabana/Mapungubwe seed-123 state at day 12,
time 120 has 173 living crops and 92 intact walls. The original campaign
timing log recorded 120 daylight steps. Median decision time was 0.73 ms,
but 13 decisions at five-second intervals from time 55 through 115 each took
9.6–10.8 seconds. Median native tick time was 6.37 ms. This is a player-policy
planning spike, not a slow simulation tick or GPU rendering measurement.

`tools/probe-paid-perimeter-snapshot.mjs` restores that snapshot and quotes its
already-paid contour on a copy. With current experimental source
`51565e3d`, the cold native quote took 28.9 ms and its hypothetical perimeter
proof took 1,140.1 ms. The proof rejected the contour as
`native-service-component-unproven`; it never grants fictitious protection.
The first radius checked 5,568 service poses (4,399 certified) and the second
reached 4,856 poses before finding the unproven service point. Thus a single
proof already performs over 10,000 physical service-pose checks. The sampled
CPU profile attributes its largest self-time groups to procedural terrain
`lattice`, wall bounds, slope, fluid and swept navigation tests.

This probe is **not** a replay of the whole 10-second decision: the policy may
quote multiple contours and perform additional validation, and its warm caches
and planning history differ from this cold copy. The snapshot source was
`5980e3be`; the probe uses the later V4 branch with the isolated retreat fix.
Balance values and economics are unchanged between those revisions. The
result supports measuring and reducing duplicate or unnecessary full proofs
before pursuing another OpenCL kernel. The separate 21-night pilot remains
the authoritative campaign execution.
