# León: calibración anatómica y candidato mandibular

Estado: **en elaboración; no instalado en el juego**. Fuente activa conservada:
`539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb`.

## Actualización v13–v14: unión facial y material

Se corrigieron los pesos del núcleo del hocico hacia Head, con transición suave
en mejillas/cuello y selección restringida al componente corporal. La auditoría
de 1.050 vértices a lo largo de los seis clips reduce la separación respecto a
Head de 6.12 cm a error numérico (~1.21e-15 m). La pose Running 0.35 s / boca
0.85 se revisó de nuevo en Three.js: lengua y dientes vuelven a quedar dentro
del labio inferior. También se inspeccionó Weapon_Combo_2 a 3.32 s. Esto corrige
el fallo localizado; no es aprobación de todos los clips, poses o expresiones.

El comparador de superficies conserva posiciones y UV fuera de la edición oral.
Permite ahora explícitamente los cambios de pesos en la zona facial documentada:
1.821 esquinas comparadas cambian de pesos allí; fuera de esa zona el error de
pesos es cero. Melena y adornos separados se excluyen de la selección de autoría.
La transición de piel necesita todavía la revisión visual completa.

Por observación del usuario se compararon los materiales con los de la hiena.
El león usaba rugosidad 0.50, normal strength 1 y reflexión especular por defecto;
la hiena usa 0.85, 0.55 y specularFactor 0.36. `--fur-material` reproduce estos
ajustes en Material_0 y Rear cloth, conservando el material oral y el de reparación
de melena. Se inspeccionó frente neutral en Three.js con iluminación/cámara iguales
(`material-original.png`, `material-fur.png`): los reflejos amplios de plástico se
reducen. La forma laminar de los mechones y los brillos pintados en el albedo no
desaparecen por cambiar parámetros del material.

Verificación v13→v14: cuatro primitivas, 30 atributos geométricos exactos, seis
clips conservados, imágenes embebidas con hashes idénticos. No hay nuevas texturas
ni geometría por este ajuste. El material principal comparte atlas con adornos,
por lo que estos también se vuelven más mates. El exportador añade
KHR_materials_specular (ya utilizado por la hiena); el coste GPU específico y la
apariencia en iluminación día/noche del juego siguen pendientes, sin afirmar
coste cero. v14 sigue como candidato, no sustituye todavía el GLB activo.

## Actualización: candidato v9

### Avance posterior v12: exportación y prueba en Three.js

La auditoría dental encontró una deformación del 16.25% en aristas del colmillo
inferior izquierdo: se le aplicaba el gradiente de la mejilla. Ahora todos los
dientes inferiores reciben la misma rotación mandibular. Error máximo a apertura
completa: 0.0264% (aristas pequeñas en coordenadas float32). A media apertura
queda una contracción máxima del 2.003%, propia de interpolar linealmente un giro
de 0.4 radianes. No se afirma rigidez exacta durante todo el recorrido.

La primera exportación falló la comparación de clips: reducía 96 muestras/s a
24, con diferencias de hasta 6.77 cm y 0.404 rad. El importador también colocaba
los strips en el fotograma 1, desplazando 31.25 ms los clips a 96 Hz. Se conservan
ahora tanto 96 Hz como el inicio original en el fotograma 4 (1/24 s), antes de
importar. Los seis clips / 78 huesos / 246 poses pasan con error máximo de
posición 0.000002763 m y de ángulo 0.000007763 rad.

**Validación visual animada FALLIDA, integración pendiente:** el GLB v12 se ha
ejecutado en Three.js mediante `actor-expression.html?actor=lion`. Carga y recibe
el morph en tres primitivas, pero a `Running=0.35 s` y boca `0.85`, la lengua y
los dientes se separan del labio inferior. La cavidad sigue `Head`; los pesos
originales del hocico se reparten entre varios huesos. La auditoría específica
de 1.050 vértices del núcleo del hocico mide hasta 0.061232 m respecto a `Head`
en los clips originales. Conservar los huesos no valida la unión de la piel.
La captura `v12-running-mouth-misalignment.png` documenta el fallo; no se ha
instalado el candidato. Siguiente corrección: reconciliar el skinning oral y del
hocico, preservando collar, melena y transiciones, y repetir la misma pose.

El visor incorpora selección del candidato de león, seguimiento de rostro y
tiempo manual de clip para reproducir el problema. El parpadeo del león continúa
pendiente, como indica su etiqueta. Los seis tests del controlador facial pasan;
no prueban la calidad visual ni corrigen el fallo anterior.

Se corrigió la alteración exterior restringiendo la soldadura a la región oral.
La copia soldada para estudiar conectividad es ahora desechable. El comparador
de caras distingue orientación y UV para no confundir triángulos coincidentes:
14.723 caras / 44.169 esquinas fuera de la región de edición conservan posiciones,
UV y pesos con error máximo cero. La diferencia máxima de componentes de las
normales es 0.0003252; la puerta permite 0.001. El render neutral vuelve a
conservar el aspecto de los ojos. Esto no prueba los clips ni la región editada.

Se añadió una cavidad con paladar, suelo, paredes laterales, fondo y lengua con
volumen, además de dentición procedural original (sin recursos externos).
La entrada frontal permanece abierta. Añade 1.450 vértices, 1.310 caras de autoría
y un material; no son todavía recuentos de triángulos/draw calls del GLB final.
El primer interior sobresalía por la comisura izquierda; se estrechó y retranqueó.
Los primeros dientes también aparecían en neutral. El candidato v9 calcula el
retranqueo contra la superficie real mediante rayos y desplaza cada pieza entera,
en lugar de deformarla o suponer simetría. Guarda esas distancias en el informe.

Se han revisado los renders v9 de frente cerrado y abierto y ambos perfiles
abiertos. Ya no aparece el colmillo fuera del labio en el frente neutral. Quedan
pendientes el recorrido completo, la legibilidad/equilibrio de ambos colmillos,
la auditoría dental durante interpolación, clips y Three.js. No se ha instalado
este candidato ni se declara terminada la boca. Las capturas v2 se conservan
como diagnóstico histórico; las nuevas llevan prefijo v9.

Se han renderizado el original y dos candidatos en Blender 4.5.3. Las referencias
frontales y laterales muestran la línea labial bajo las almohadillas del hocico,
por encima de la barba blanca. Los colmillos colgantes pertenecen a los adornos;
no se han tratado como dientes de la boca. El inventario topológico encuentra
una pequeña frontera de cinco vértices junto a una comisura, no una abertura
dental completa como la de la hiena.

`landmark-pixels.json` contiene puntos seleccionados visualmente en los renders;
`landmarks.json` conserva sus intersecciones 3D reales con el modelo, cara y hash.
Son referencias de autoría, no una segmentación automática aprobada. El perfil
de corte actual se ha ajustado al lateral y requiere revisar su correspondencia
frontal fina. El corte no es un plano horizontal por el mentón.

El candidato v2 abre la mandíbula 0.4 radianes, con transición hacia las
comisuras, y mantiene la barba unida a la mandíbula. Se han inspeccionado frente
y ambos perfiles a apertura completa y el frente neutral. No tiene todavía
paladar, suelo oral, lengua ni dentición nueva: se ve la cara interna de otras
superficies originales. No se ha añadido una cortina negra para ocultarlas.

La primera reconstrucción alteró el sombreado de zonas ajenas a la boca. El
candidato v2 transporta las normales originales por esquina a través de BMesh.
Mejora el sombreado, pero aún se aprecia una diferencia alrededor de los ojos
incluso en neutral; queda pendiente aislar normales, soldadura y pesos antes de
aprobar la conservación del original. No se considera una corrección terminada.

Pendiente: resolver esa diferencia, terminar la cavidad anatómica, comprobar
0/25/50/75/100%, invariancia de UV/accesorios/pesos, clips originales, exportación
GLB y ejecución real con ataque, impacto, caída y recuperación. El parpadeo del
león tampoco está implementado todavía. Estas capturas no prueban integración
ni rendimiento en Wild Engine.

Reproducción actual desde la raíz del worktree, sustituyendo `blender` por su ejecutable:

```powershell
blender --background --python-exit-code 1 --python tools/guardian/prototype_lion_jaw.py -- --input public/assets/539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb --output C:/tmp/guardian-faces/lion-jaw-v9.blend --oral-cavity
blender --background --python-exit-code 1 --python tools/guardian/inspect_actor_face.py -- --input C:/tmp/guardian-faces/lion-jaw-v9.blend --output C:/tmp/guardian-faces/lion-jaw-v9-1 --center 0 -.23 1.55 --extent .24 --expression mouthOpen --amount 1 --samples 8
blender --background --python-exit-code 1 --python tools/guardian/audit_lion_untouched_surface.py -- --source public/assets/539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb --candidate C:/tmp/guardian-faces/lion-jaw-v9.blend --output C:/tmp/guardian-faces/lion-v9-surface-audit.json --check
```
# Eyelid authoring checkpoint (initial failure)

`tools/guardian/add_lion_eyelids.py` authors independent left/right closure
and 25/50/75% corrective poses on the v14 jaw/material source. The original
body remains intact. Contours were traced against the original 768px front
inspection at center `(0,-.18,1.67)`, extent `.26`, separately for each eye.
The candidate adds 594 vertices / 512 quads and a packed 1024px frontal
base-color projection, using existing fur imagery only.

Two Blender iterations were rendered. Direct original-island UV sampling
produced unrelated stripes; the continuous atlas removes that mapping issue.
However, the v2 closed front and quarter images still show an angular surface
and conspicuous shading bands. Ray-following the low-poly eye surface is not
an acceptable final eyelid envelope. Next: smooth the envelope while checking
occlusion, then inspect neutral, partial closure, full closure and animated
head poses. These images are **failure evidence, not visual acceptance**.
No blink GLB has been installed or tested in the game. The local editable
checkpoint is `C:/tmp/guardian-faces/lion-lids-v2.blend`.

## Eyelid v6: smoother closure and animated skin correction

The updated tool fits a quadratic eye envelope, joins its edges to the source
surface and samples clean nasal-bridge fur instead of painted brow markings.
A 0.6 linear color multiplier matches the surrounding shaded socket more
closely. Neutral, half and full closure were rendered in Blender v5; the
original angular bands are no longer visible in the reviewed front views.

Three.js then exposed a separate failure: at Running 0.35 s, full closure
revealed iris because original eye skin still followed Neck. v6 corrects
visible eye-region weights to Head with a 20px blend boundary. The failed
and corrected screenshots are retained. Full closure with mouth 0.85 in
that pose and half closure from three quarters were visually inspected.
The page reported eight lid bindings, four visible draw calls and no errors.
This is the asset QA scene, **not integrated-game acceptance or a performance
comparison**. The six controller unit tests pass. The 246-pose native clip
comparison and existing muzzle audit also pass; neither audits all eye skin.

Current local source/export: `C:/tmp/guardian-faces/lion-lids-v6.blend` and
`.glb`; browser fixture `test-results/lion-face-candidate.glb`. Still not
installed. Remaining: inspect more animated poses, both profiles, eye-skin
transition boundaries and continuous blink interpolation; improve oral
shading in Three.js and finish the production asset validation.

## Oral v15: winding and depth shading

`repair_lion_oral_shading.py` found negative signed volume on the closed
tongue and several dental components. It repairs face winding, verifies
all 17 closed components point outward, and asserts vertex and morph
coordinates remain exactly unchanged. The cavity remains open at the front.
Tissue vertex colors now darken with depth; teeth retain their ivory colors.
No new texture, mesh or draw call was introduced by this repair.

Front and both profiles at mouth 0.85 were inspected in the Three.js QA page.
The tongue is less bright; the front view still has simpler shading than
the Blender render, so this is not final artistic acceptance. Both profiles
show the open aperture and recessed tongue. The dental rigidity audit and
native-clip/muzzle audits pass. Source is
`C:/tmp/guardian-faces/lion-oral-v15-checked.blend`; the equivalent v15 GLB
is loaded in the browser fixture. Production lion remains unchanged.

## Combat fixture integration

`guardian-combat.html?face=lion` now selects and substitutes the committed lion
candidate through the existing AssetManager path. Existing `?face=1` hyena
behavior is retained. The visible diagnostic identifies the candidate species.

`combat-cycle.json` records one continuous Game.tick/WorldScene Attack cycle:
8.0938 simulated seconds, peak one physical ragdoll, finalDownCount 0,
physicalBodies 0, resumed attacking, 11 facial bindings and no errors.
Maximum visible Guardians remained one. The earlier paused contact inspection
had eyes 1/1 and mouth 0.8205; it did not simulate the ragdoll. SFX source
creation succeeded for lion_hurt and beast_take_damage in the continuous run;
there was no listening assessment of the mix.

This unpaired diagnostic had frame p95 99.8 ms / p99 133.1 ms on Intel UHD,
physics p95 4.1 ms and peak creation 14.7 ms. These are recorded observations,
not attribution of the existing fluency issue or performance acceptance.
General fluency investigation remains assigned elsewhere. The contact and
final state were visually inspected, but the whole fall/recovery was not
captured and reviewed frame by frame. Full animation quality, obstacles,
concurrency, directional variants and paired feature-cost testing remain open.

## Recorded cycle review

`combat-cycle-video.mp4` contains a subsequent continuous cycle, with its
matching diagnostics in `combat-recorded-cycle.json`. The QA recorder now
supports the currently selected species and direction without replacing the
historical day/night videos. The MP4 is a 30fps delivery conversion; duplicated
video frames do not indicate 30fps game rendering. Recording metrics are not
comparable to the unrecorded run.

Review used a one-second contact sheet across the sequence and a four-samples-
per-second sheet around recovery (`recovery-reviewed.png`). The animal falls,
rests and returns to its attack behavior. No detached accessory was confirmed:
the suspicious mound is already present before the animal is created.
The rise still looks too rigid, with limited visible arm/leg support. This is
an outstanding artistic issue in `BeastRecovery`, not accepted get-up quality.
Audio is included in the recording but has not been listened to for mix review.

## Supported recovery iteration

`BeastRecovery` now blends the hands toward ground supports during the brace
stage, releases them during the rise, deepens the intermediate crouch and
extends the default recovery from 1.65 to 1.9 seconds. The same bounded
two-segment IK is used for arms and legs; no per-frame allocations or extra
rigid bodies are introduced by the support chains. This affects all species
and physical/baked recovery, so broader visual checks remain necessary.

All 12 ragdoll tests and 19 expression/combat/baked tests pass. The get-up
test now runs for the configured duration rather than a fixed 100 frames;
its unchanged continuity/penetration assertions pass for all five rigs.
`combat-supported-recovery.mp4` and `supported-recovery-cycle.json` record
another completed cycle with zero final physical bodies/errors. The reviewed
frame sheet covers 4.5–7.25 seconds of this recording. Different fall direction
and camera framing obscure hand contact, so the visual improvement is **not
yet accepted**. Next review needs a consistent side view with the full animal
in frame and recovery-phase timing, rather than inferring contact from logs.
The different frame times between recordings are not a paired performance
comparison and are not attributed to this change.

