# León: calibración anatómica y candidato mandibular

Estado: **en elaboración; no instalado en el juego**. Fuente activa conservada:
`539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb`.

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

Reproducción desde la raíz del worktree, sustituyendo `blender` por su ejecutable:

```powershell
blender --background --python tools/guardian/prototype_lion_jaw.py -- --input public/assets/539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb --output C:/tmp/guardian-faces/lion-jaw-v2.blend
blender --background --python tools/guardian/inspect_actor_face.py -- --input C:/tmp/guardian-faces/lion-jaw-v2.blend --output C:/tmp/guardian-faces/lion-jaw-v2-open --center 0 -.23 1.55 --extent .24 --expression mouthOpen --amount 1 --samples 8
```
