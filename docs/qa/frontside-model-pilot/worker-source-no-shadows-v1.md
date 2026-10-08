# Source control remains variable with native shadows excluded

Native source-only diagnostic at3cb4b1df, root tab775 closed after capture. Same
already-invalid source pose Idle0/Sabana/day/az8.2313115/elev-15; 30 original draws,
zero candidate samples. Controls alternate0/21changedbytes,max59,alpha0. No gates
were relaxed and this was not a reroll to accept the independent V1 candidate.

shadowsEnabled=false and effective uNativeShadowOn(type5126)=0. The previously
omitted uNativeShadowFiltered sampler(type35682) is now captured, unit1,
compareMode34894/compareFunc515, min/mag9728, no separate sampler object. Active
program/uniforms/state/matrices/texture metadata/layouts are unchanged across
30repeats; CPU geometry fingerprints likewise unchanged. Actual GPU texture
contents remain unobserved. Shadow exclusion does not eliminate variation in
this fixture, so shadows are not its exclusive cause here. No causal attribution.

Console has ONE THREE/ANGLE X4000 warning about potentially uninitialized
f_environment4 at lines725/730, timestamp05:32:16.914Z; no errors. Earlier c340
console was empty, but that fact is not inherited by this variant. Original
environment4 computes normalize(d), atan(d.z,d.x), acos(clamp(d.y,-1,1)), two
textureLod samples and an unconditional mix return. Static inspection finds no
missing return path; the warning is not proof of an uninitialized source value
or cause. Singular inputs/ranges, TBN/derivatives, driver evaluation and raster
ordering remain hypotheses requiring separate diagnostics, not production fixes.

Authoritative report SHA2568837f2fb6e043d2b165c5a782b71b9f1defee86fab3c360cd7b0cd6697ff0841
matches root's copy. report/PNG/browser/console preserved under
worker-source-no-shadows-v1*. Conditions reflect the captured process inventory,
not an idle machine. SourceAssetSha is report.sourceSha256 (runtime model asset),
not an instrumentation script hash.
