# Cancellable texture, decode and fence waits

Main follow-up after the owned-compiler AB/BA: performance activation remains
unapproved. This change adds a separate `ownedWaits` QA option, requiring
`ownedCompilation` so it cannot leave Three's unowned compiler timer running.
Neither production world flag is enabled.

`wait-gpu-frame.js` schedules one frame per wait and observes the existing
lifetime/deadline check independently of RAF via the shared waiter. Its default
RAF handle is cancelled on interruption; injected frame sources retain their
own cancellation responsibility. No duplicate frame loop is introduced.

The native preparation option uses it between texture batches and while a
GL fence remains unsignalled. Optional image decoding uses the same cancellable
wait, observing late failures without continuing uploads. Cancellation does
not interrupt a decoder or driver already running; JavaScript blocking and
browser timer throttling still limit when checks can execute.

Fence readiness now rechecks ownership/context after the successful query
before accepting the result. Real fence failures retain their error even when
ownership changes inside that query. The owned path avoids deleting an old
fence in a lost/restored or different context; a valid live-context fence is
still deleted after owner cancellation. The existing texture-cache epoch
detects loss and restoration between checks.

The three native far preparation sites expose only explicit
`world.farOwnedWaits === true`; the traveling fixture accepts `ownedWaits`
together with `ownedCompilation` and reports both. The previous AB/BA remains
historical evidence for compilation only, not these newer waits.

77 directed CPU tests pass across compiler, waiter, frame, native preparation
and isolation suites. Twelve added cases verify default RAF cleanup, one frame
per wait, suspended waits, cancellation before remaining uploads, late decoder
failure, fence timeout, stale-context handle protection, ownership invalidation
inside final readiness and real query fault precedence. These use renderer/GL
doubles. Native browser and resource/performance regression evidence for the
new wait option is still required before activation.
