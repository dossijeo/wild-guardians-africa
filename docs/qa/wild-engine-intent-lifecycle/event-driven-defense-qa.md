# Event-driven defense policy experiment

All reports below use the real Sabana/712 native campaign runner, the same
tracked WASM binary, spatial advice, the expanding paid defense policy and
native worker/animal intentions. Each JSON report records its source commit,
WASM hash, inputs, per-day serialized hashes, finance, decision timing and
raid evidence. The only explicit gate difference in matched runs is
`WILD_ENGINE_DEFENSE_GATE=event` versus `periodic`.
The ten raw reports are stored losslessly as `sabana*defense*.json.gz`;
each archive was decoded and parsed after creation.

| Source | Variant | Nights | Seconds | Defense plans | Paid pieces | Final live crops | Final coins |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `77c1062c` | Initial event gate | 3 | 28.60 | 148 | 37 | 36 | 210 |
| `77c1062c` | Periodic comparison | 3 | 18.10 | 21 | 24 | 60 | 498 |
| `2502b841` | Event gate plus full-stroke savings | 3 | 28.56 | 3 | 0 | 87 | 568 |
| `1a32727b` | Deferred quote, event gate | 3 | 14.06 | 3 | 0 | 87 | 568 |
| `1a32727b` | Deferred quote, periodic | 3 | 14.00 | 21 | 0 | 87 | 568 |
| `1a32727b` | Deferred quote, event gate | 5 | 29.16 | 4 | 0 | 121 | 779 |
| `7ec71f05` | Full savings before all seeds | 5 | 6.65 | 1 | 0 | 0 | 688 |
| `73675669` | Replant before discretionary savings | 5 | 35.44 | 5 | 37 | 90 | 685 |
| `73675669` | Same policy, nights 6–7 included | 7 | 64.59 | 17 | 37 | 122 | 719 |

The initial event gate was a regression: crop placements and deliveries woke
the policy 426 times, leading to 148 plans in three nights. Coalescing
dependent events reduced plans to three, but profiling found that the three
complete `quoteWallChain` calls alone cost about 14.5 seconds. The current
policy uses the inexpensive count of missing stroke slots as a conservative
cash threshold and performs the complete physical quote only when that
amount is affordable. In the matched `1a32727b` three-night runs, daily
serialized hashes, crop counts and coins were identical; the event gate made
three plans versus 21 periodic plans. Their 14.06 versus 14.00 seconds do
**not** demonstrate a total runtime speedup. A periodic run of the earlier
full-quote implementation was stopped after more than two minutes of CPU for
three nights; it had no completed report and is not counted as a result.

The first cash-reserve policy also failed economically: it blocked replacement
seeds after harvest and left no live crops on day 2. The current policy
prioritizes the existing staff's ordinary crop workload, then reserves cash
for the full wall stroke. On the five-night follow-up it bought 37 modules
for 370 coins while retaining 90 live crops. Thirteen expected wall slots
were occupied by buildings, large trees or rocks. Wild Engine certified one
crop group as protected after that purchase; wall spending alone is not
treated as proof of protection for every crop.

The seven-night follow-up completed all seven physical raids with verified
observer coverage and no technical stop. Nights 6 and 7 destroyed six and
three crops respectively. Protection events recorded a breach and later
restoration, with 122 live crops and 719 coins after night 7. This is a
functional check through the first non-introductory attacks, not a balance
acceptance result or evidence of 100-night sustainability.

The remaining architectural gap is the JavaScript rectangle used to propose
the wall stroke. Its conservative slot-price threshold can defer a purchase
longer than the exact native-certified cost when natural obstacles substitute
for modules. The existing enclosure service uses native certification but
still proposes a JavaScript rectangle; its speculative preview took 6.6 s
for a 66-crop group in the [day-3 profile](enclosure-preview-profile.md).
It should not replace the bot's routine decision path until the full preview
cost is removed or reduced. Income and world events
now wake the experimental policy; the periodic mode remains only for
comparison and non-intent campaigns.
