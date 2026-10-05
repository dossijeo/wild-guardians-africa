# Wall drawing: first optimization

Native world, seed 712, Savanna/Mapungubwe, medium quality, thirty seeds and a
centre paid through the original Game commands. Clock is paused for this
controlled rendering/input fixture; it is not a full gameplay playthrough.

On the same 48 screen positions, after warming both paths:

| CPU picking | Median | p95 | Total |
| --- | ---: | ---: | ---: |
| Original full entities + plants + terrain | 3.0 ms | 8.8 ms | 196.5 ms |
| Terrain only | 0.7 ms | 1.7 ms | 41.7 ms |

All resulting ground positions matched within 1e-8. This is CPU timing on this
host, not GPU frame time or a promised mobile FPS improvement. A real browser
drag submitted nine world samples, created seven wall modules immediately,
charged 70 coins (550 -> 480), and reported no errors.

Pointer samples and native curve processing remain intact. Preview/budget work
is scheduled once per animation frame; cancellation, multitouch and release
cancel queued work. Release still submits the complete sampled curve for final
native validation and payment. Terrain guide heights are cached by point and
field identity; camera movement still reprojects the line each frame.

Regression checks cover curve retention, cancellation, budget/enclosure rules,
normal entity selection, terrain-only picking, changing camera, point and terrain.
Evidence: savanna.json, savanna-drag.png, and the public controlled fixture
tests/browser/wall-drawing-performance.html. Remaining: additional biomes,
physical touch and large resident farms; analytical terrain picking may further
reduce the remaining mesh-raycast cost if measurements justify it.
