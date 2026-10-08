# Source-only shadow sampler isolation, prospective diagnostic

The source-state audit at c340c8cf omitted SAMPLER_2D_SHADOW (35682), including
uNativeShadowFiltered. Native-shadow samples the actual depthTexture, whereas
the existing packed shadow readback observes the color attachment. Color
attachment equality cannot establish equality of native depth sampler texels.
The earlier unchanged captured state remains valid in its recorded scope; it
does not prove a cause, rule out unseen GPU contents or accept a candidate.

The new source texture helper records sampler types/targets, texture and sampler
object identities, actual filter/wrap/LOD/compare parameters, including depth
comparison samplers. It only changes the active texture unit during inspection
and restores it in finally. It does not change bindings or filtering, read GPU
texels, disable driver optimizations or measure GPU cost. CPU fingerprints,
matrices and active uniform capture remain unchanged.

Next isolated source-only diagnostic uses the same already-invalid source Idle0
pose, Sabana/day, az8.23131151293202/elev-15, 30 repeats, but disables renderer
shadow draws and native shadow sampling. Source-only sourceTwin/controlDiagnosis
ensures no candidate is drawn. The unchanged visual gates are diagnostic facts,
never a reroll to approve the withheld V1 matrix. Report active uNativeShadowOn
must be0 before interpreting the intended shadow exclusion. No source-normal,
position, shader expression, camera or repair changes are introduced.

URL (replace the process label with an authoritative pre-draw inventory):

http://localhost:5284/tests/browser/frontside-worker-visual.html?sourceTwin&controlDiagnosis&closedSubsetV1&sourceStateAudit&noShadows&limit=1&cpuCampaigns=49032%2F41320%2F41304-active-inventory-required

If variation persists, shadows are not its sole cause in this altered fixture.
If it disappears, this run alone does not identify depth-map contents, shader
evaluation or rendering state as the cause. Keep all original negatives and
the0candidate comparisons separate. No benchmark or category approval.
