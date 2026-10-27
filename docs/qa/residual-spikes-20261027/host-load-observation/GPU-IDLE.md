# Idle GPU process observation

Windows GPU Engine utilization counters sampled five times at two-second intervals, with no game benchmark running. Retained samples above1% in gpu-idle.json. ChatGPT pid42388 used about5.6–8.25% on the reported 3D engine; dwm pid1716 about3.93–8.78%. These are per-engine counter values, not GPU frame time, clock/thermal telemetry or an additive whole-adapter percentage.

This establishes non-game GPU activity during this observation only. It does not explain historical ABAB variance or invalidate particular results. Next diagnostic can collect the same counters alongside a run with explicit sampler-overhead accounting; acceptance still requires repeatable game measurements. Do not terminate desktop/Codex processes based on this observation.
