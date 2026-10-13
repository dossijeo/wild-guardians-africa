# Day-13 repair-point direct-route probe

`tools/probe-repair-direct.mjs` used the retained native day-13 time-191 checkpoint, worker `worker-11356` and wall `structure-4265`. All four repair service points were individually walkable, but none had a directly clear segment from the worker. The existing pathfinder eventually reached service point 3 after failed searches for points 0–2. In the prior trace, the first failed point consumed 273 ms and the successful point consumed 37 ms.

A direct-segment-first pass cannot eliminate this spike, and simply reordering the service points without a connectivity proof risks choosing a worse route. This probe changed no gameplay code. A bounded multi-destination route search or reusable topological certificate remains an investigation, not an accepted implementation.
