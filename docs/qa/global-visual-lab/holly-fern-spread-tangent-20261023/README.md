> CORRECTION (2026-10-23): the fern QA call `resizeShadowMap(light, 4096)` actually selected 1024 because the API expects a quality name. Claims of a 4096 map in this report are incorrect. See `../holly-fern-shadow-actual2048-20261023/README.md`. Original measurements are retained.

# Fern silhouette against the supplied mockup

QA-only artistic iteration; no default renderer or main change. Seed 712, 1280Ãƒâ€”720, medium, three native campaign views with full distant impostors/mountains, day and night. `side-by-side.jpg` juxtaposes the unmodified artistic reference and actual renderer output; `iterations.jpg` compares four real renders. No screenshot relighting.

## Changes and selection

- Descending arch: same lengths, widths, anchors, masks, colour and density; tips descend instead of remaining raised. Kept as a comparison, not selected alone.
- Analytic normals: adapt baked normal direction to the revised arch derivative. Wind deformation is still not represented in that derivative.
- Spread candidate: lengths .70/.65/.73/.68, constant width at 85% of previous nominal half-width, height .035 + .18 sin(pi*t) + .14*t. Four fronds, 32 triangles per clump, same instancing and edge thinning. Prefer this candidate for the next artistic pass: broad open crowns are more legible, without hiding the coverage.

## Verification

18 captures across the three new variants. Camera, target, time, draw calls and triangles match the previous clumps capture in all six conditions for each variant. Calls/triangles by view: 72/334495, 83/392455, 65/385522. No captured JavaScript, shader or WebGL errors. These are structural comparisons, not FPS measurements: changed projected area can alter fill cost despite equal triangles.

## Still different from the mockup

The source holly fern has broad leaflets; the mockup has finer, more separated leaflets. Ground detail remains stronger and cooler, water darker, projected fern shadows less distinct, and distant tree layout differs. This is not artistic equivalence and is not a completed biome. Shadow map remains the 4096 diagnostic setting inherited from the lighting experiment, not a validated production budget. No performance gain claimed.

## Reproduce

PowerShell, lab worktree with Vite on 5190:

```powershell
$env:WG_CARD_TREATMENTS='cards'
node tools/experiments/capture-holly-fern-spread-tangent-20261023.mjs
```

Next: improve separation of illuminated crowns from ground and cast shadows while preserving this coverage; then validate motion and benchmark the selected recipe before promotion.
