# First real crops after loading — no resource probes

Runtime `08fe1462`; QA fixture `e9b7d48d` (later HEADs only add independent fixture/docs). Native IAB context77, media/Sabana/Mapungubwe, seed712, 1280×720 CSS viewport / 1600×900 recorded world drawing buffer. A normal paid centre was built after loading, then a first real maize and a first real millet were planted through Game.plant, each adding exactly one plant. The diorama did not mutate the farm. No BufferRequests/TextureRequests, timer-query sampler, GL polling during the crop windows, or renderer/material/far wrappers were installed.

| Species | Game command CPU wall time | First renderer wall time | Following 2s RAF intervals | Max interval / >100ms |
|---|---:|---:|---:|---:|
| Maize | 0.9ms | 143.7ms | 65 | 149.6ms / 1 |
| Millet | 0.6ms | 53.3ms | 76 | 50.0ms / 0 |

These are CPU wall time and RAF scheduling proxies, **not GPU durations or presented-frame timing**. RAF callbacks use browser-provided timestamps; their maxima need not equal individual input-task/render durations. Source attribution is still required: the maize result confirms a real first-draw blocking interval, but does not establish whether texture initialization, shadow/program realization, pending GPU work or another renderer path caused it. It must not be attributed exclusively to disposing the diorama atlas without a matched control or trace.

Initial loading took20.108s, controls24.223s, with two intervals above100ms. This single unpaired observation is not loading-time acceptance or a speedup. Four historical CPU campaigns remained active:41320/41304/49032/48904 (the last is GranRío/Etíope, advanced from the previous completed child28864 under parent27132); the focused inventory is retained separately. Root and repair did not open another GPU scene during the crop windows.

Ready, logical state and intended final camera passed before the optional paid QA commands. Errors remained empty; explicit disposal confirmed context loss and tab77 was closed before root reserved the next resource window. `first-crops-unprobed-08fe1462.json` retains full actions, long tasks, intervals and cleanup. Earlier instrumented observations remain in `texture-owner-new-game-08fe1462.json` rather than being overwritten.

Open gate: resolve or justify first-draw behavior against archived production main, without silently moving preparation out of loading and into gameplay. The independent baseline first-crop fixture on5292 is prepared but not yet executed. No release/PR acceptance follows from this probe.
