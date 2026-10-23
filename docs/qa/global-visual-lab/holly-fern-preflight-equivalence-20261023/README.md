# Same-load shadow preflight equivalence

See ../holly-fern-shadow-preflight-20261023/README.md for the implementation and timing decision. Real native fern scene, close camera, day/night and wind times2/3. Synchronous captures avoid intervening browser animation. Before the preflight capture, render t-.1 so the tested target time actually changes; baseline is explicitly forced. Stable and stable2 then check reconstruction and cache reuse.

All12pixel comparisons versus baseline are exact; zero GL/JS errors. In each case preflight draws once, stable rebuilds once, stable2 obtains one cache hit. Does not cover context loss, all quality switches or streaming. Production remains unchanged.
