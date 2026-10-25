# Cause: fixture advances before asynchronous QA pause

Instrumented both runs: locomotionDepth=true; other depth requests false. One locomotion effect (footstep dust) remains active. Recorded elapsed120.32879999998549 and120.26519999996165 versus saved119.99999999999746. Pausing after aria-busy=false allowed a variable amount of simulation before the test attached. The fixture was identical on disk but not at measurement start. This explains variable transient effects; it does not prove every remaining geometry difference has the same cause.

QA fix prepared in measure-desert-populated-frozen-20261022.mjs: call existing Game.pause(state,'menu') immediately before final loading-overlay disposal/game screen, via response interception. Assert elapsed equals saved value before proceeding. Effects remain enabled and derive from the actual saved state; none are disabled to reduce cost. Record elapsed, worker data, chunks and workloads. Needs completed repeated run and visual equivalence validation. No production simulation or renderer edits.

Instrumented timing has stack-capture overhead; not usable as performance results. Reproduce audit-desert-populated-effects-20261022.mjs. Raw evidence and compact effect-summary.json retained. Earlier populated comparisons that paused after loading require caution about transient actors/effects even when camera/time matched.
