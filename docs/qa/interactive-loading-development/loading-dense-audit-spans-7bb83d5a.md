# Dense snapshot CPU attribution

Diagnostic native context107, fixture7bb83d5a with unchanged runtime062a6548, same archived dense save as106. QA-only isolation ON; retain/shadow/GL trace/resources/timer queries OFF. Seven synchronous CPU wall spans are opt-in audit-spans; no work is omitted, reprogrammed, or removed from recorded frames.

Measured decode/complete native validation207.6ms. Four fixture-only state serializations147.2/163.2/166.9/176.2ms. Resume0.1ms and Navigation.setState0.6ms. These source spans demonstrate substantial audit cost and actual Continue parsing cost. They do not attribute every remaining long frame or prove GPU cost.

All881RAF samples retained: maximum266.1ms,35above50ms,11above100ms. Initialization14,695.7ms/control19,033.9ms, no causal comparison to106. Logical/camera/readiness checks all pass, errors/warn/error logs empty. Explicit disposed/contextLost true, raw report exported, tab closed, final inventory empty. All negative data remain valid and no intervals are excluded for acceptance.

Next candidate moves only native deserialize/validate to an owned Worker and starts Continue presentation before this work, keeping originals/backup recovery and complete validator semantics. Structured-clone delivery and peak memory must be measured; the synchronous no-Worker compatibility fallback remains explicitly reported rather than described as non-blocking. Worker cancellation, deadlines, transport errors, late results, ownership and snapshot parity need directed and actual browser evidence before acceptance.
