# More distant band versus actual native residency

QA source871ab1a, Sabana/Mapungubwe/media, pilot native-sun atlas, configured120–160m, fog30–300, sky palette/soft backdrop, tree0:-2:10. Native terrain remains exact25chunks; gameplay off.

Incoming pause1.7s at139.0997m has physical=[]/retainedPrepared=false/ready0: billboard retained correctly, but this is NOT a test of mid-band matching. Full20s approach/return finishes with zero target drops, logical state identical, errors/GL0. First ready at3.6808s corresponds about95.3m in recorded near25/far180 trajectory; merely moving the configured band farther cannot prove an earlier initial handoff while a native model is absent. 755transitionframes/267ready are diagnostic counts, not timings/FPS.

Further visual review of the outgoing prepared transition and residency/cost policy remains required. No setting promoted to default.
