# Manglares context cancellation counterexample

Source 57710f8 (runtime c0da394, main c18d119). Experimental opt-in 120–160m with logical standby preload. Approach, night orbit and day lateral completed with unchanged logical state and no rendering/GL errors. Initial stationary context loss/restoration passed. A second loss while approach/preparation was in flight produced seven `Native GPU preparation cancelled` errors, despite GL/console errors remaining zero. This restoration is **not accepted**. Owner-only close released resources afterwards; its cleared errors do not invalidate the prior failure.

The fix captures preparation's resource epoch and rejects the previous generation even if restoration has already finished. Only explicit lifetime/context cancellation is typed and counted separately; ordinary shader/upload/fence/GL faults remain errors. Region retry and queued standby replacement recover without adopting a stale bank. Native after-fix reproduction is pending; 38 GPU/standby tests pass, including stale compile rejection without a second draw/fence and preservation of the accepted bank across a cancelled replacement.

Reports preserve the failed second restoration and post-failure close separately. No performance claim or normal gameplay activation.
