# Fractional segment memo full protected ABBA: exact parity, timing not robust, OFF

Frozen2773916b;453source hashes unchanged. PID39484/session5431 naturally returned actualexit0, PID absent. Started2026-10-12T16:08:35.553Z/finished16:13:14.636Z:279083ms. No profiler, restart, forcedGC, production flag, economics/policy change or campaign. Spatial+flat ON both arms; fractional OFF A/cache B. First pair4.17%better and exact, so source-frozen protocol continued B2/A2 rather than stopping (>5%regression threshold). Nine preflight tests PASS1338.8805ms.

| Arm | Policy proof ms | Tick ms | RSS before/after bytes | Heap used before/after bytes |
|---|---:|---:|---:|---:|
| A1 | 61945.3265 | 32.3280 | 63070208 / 204283904 | 19602720 / 101961552 |
| B1 | 59362.4886 | 30.3143 | 207077376 / 369139712 | 94827376 / 301251216 |
| B2 | 58395.6106 | 42.6170 | 367886336 / 586788864 | 294511328 / 272434192 |
| A2 | 98101.8713 | 36.7682 | 596631552 / 427646976 | 280939688 / 105779816 |

Mean A80023.5989/B58879.0496ms gives26.4228922%, but pairs4.1695444%/40.4745192% disagree greatly. Candidate arms differ1.63%, while A2 is58.37%slower than A1 and begins after considerable retained memory. **Timing gain is not robust**, despite exact functional parity and stable B arms. GC/retained cache/host scheduling are possible confounders, not demonstrated causal attribution. No continuous memory peak, standalone Map allocation or net full campaign performance is claimed. Defaults stayOFF and Q15/100 paused; about59seconds per policy act still excessive.

Complete policy reports/actions/initial/prepared/final snapshots match byte-for-byte; every state roundtrips, finalSHA a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247. Source checks before/after every arm preserve453files. B each1364345segment wrapper queries,668894hits/668962misses/26489bypasses,472274FIFOevictions. Eligiblehit rate is about50%, not668894/all surface calls. Eleven leases: eight small proofs have no memo hits; three shore proofs reach65536entries. Surface calls fall150011093→78064073 and coarse1364074→695180; not omitted terrain rules on miss, but reused exact directed boolean certificates under unchanged physical inputs.

Instrumented key construction+Map has/get totals1247.6264/1205.2745ms for B. It excludes eligibility/native/set/eviction/GC work and timing calls add overhead to B; not a complete wrapper-cost profile. Maximum retained key length3063132characters per lease (upper raw UTF16payload6126264bytes, not actual V8 string or Map memory). Native and QA memo warmth can differ; physical results stay identical. B lease-end sampled RSS max373346304/586047488 and heap max292370064/508992824bytes. Node samples overlap arm allocations, occur at eleven lease ends while memo retained, and cannot be summed or labeled continuouspeak/causedbyMap. A2 RSS before596631552 illustrates accumulation; no cleanup benchmark or GC control was substituted.

Twelve byte-preserved gzip payloads retain rawlaunch, allreports/states, summary/stdout and preflight. Verify: `node tools/audit_fractional_segment_replay.mjs docs/qa/native-proof-fractional-segments/protected-replay-2773 .` (optional frozen root lastargument). Auditor independently rechecks12hashes/453sources/fullstate/roundtrip/report/counter equality and arithmetic. Inactivity remains outside acceptance.

Potential next diagnosis, not implemented/measured: more than472k memo evictions use native evictOldest(Map) based on keys().next(). Bounded ring-queue deletion could preserve exact FIFO ordering/capacity/hit outcomes without repeatedly constructing an iterator; memory churn/key allocations also remain. No attribution of elapsed59s to that operation without a targeted measurement. Parent requests freeze and stop now while cinematic integration proceeds; no further tests/benchmarks/longcampaigns launched.
