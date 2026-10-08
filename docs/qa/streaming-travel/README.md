# Traveling: eliminar bloqueos durante el streaming

La cÃ¡mara recorre el mundo nativo sin bajar resoluciÃ³n, calidad, distancia de
dibujado o densidad. Dos bloqueos identificados y corregidos en `main`:

- `prepareNativeFarGpu` consultaba `gl.getError()` tras cada fence. El diagnÃ³stico
  capturÃ³ consultas de 100â€“133 ms. La consulta final ahora respeta el opt-in
  `diagnoseErrors`, como las otras consultas de ese helper. ProducciÃ³n conserva
  fence real, polling asÃ­ncrono, timeout, contexto, generaciÃ³n de recursos y
  cancelaciÃ³n. Las comprobaciones exhaustivas de errores GL quedan en diagnÃ³stico;
  un error GL no fatal ya no se consulta rutinariamente despuÃ©s de cada preparaciÃ³n.
- La costura del terreno lejano usaba `material.clone()`. Three serializa `userData`,
  que aquÃ­ contiene uniformes/texturas vivas; `Texture.toJSON()` puede codificar
  imÃ¡genes. Se midieron clones de **359â€“476 ms**. `cloneRuntimeMaterial` copia las
  propiedades normales a travÃ©s de una vista sin metadata y conserva referencias
  compartidas en un nuevo contenedor. Retiene explÃ­citamente el propietario de la
  mÃ¡scara de suelo. No muta el original ni cambia shader, textura o geometrÃ­a.
  El helper coincide con el desarrollado en la rama de carga interactiva, para
  evitar dos implementaciones al integrarla.

## ComparaciÃ³n local

Fixture: `/tests/browser/streaming-travel.html`; Sabana/Mapungubwe, seed 712,
calidad media, 30 s, 12 m/s, 360 m, cÃ¡mara y target desplazados continuamente
segÃºn tiempo real. SimulaciÃ³n pausada, poblado nativo, sin finca densa ni guardados.
Intel UHD, ANGLE/D3D11, Chrome 154, viewport 1280Ã—720, buffer 1600Ã—900, DPR 1.25.
No otro benchmark grÃ¡fico simultÃ¡neo; seguÃ­an cuatro campaÃ±as CPU histÃ³ricas
(41320/41304/49032/28864). No es una mediciÃ³n aislada de hardware ni de mÃ³vil.

Orden de checkpoints **A1 â†’ C1 â†’ C2 â†’ A2**, con ensayos diagnÃ³sticos intermedios.
A restaura exactamente los dos archivos de producciÃ³n de `634f948a`;
C incluye ambas correcciones. C1 usÃ³ el mismo algoritmo de copia con otro nombre
local; C2 utiliza el helper final compartido con la rama de carga. A2 vuelve a
reproducir la referencia original, despuÃ©s se restaura el candidato. Los hashes
de los archivos se guardan en `proof.json`.

| Checkpoint | Intervalos | p95 (ms) | p99 (ms) | MÃ¡ximo (ms) | Frames >100 ms |
|---|---:|---:|---:|---:|---:|
| A1 original | 513 | 149.7 | 349.2 | 399.0 | 72 |
| C1 ambas correcciones | 664 | 83.2 | 100.4 | 199.7 | 7 |
| C2 ambas correcciones | 644 | 83.2 | 116.4 | 166.8 | 8 |
| A2 original restaurado | 453 | 182.9 | 382.5 | 475.6 | 70 |

Los cuatro checkpoints terminaron con **35 chunks nuevos / 60 creados en total**,
cÃ¡mara/target finales idÃ©nticos, snapshot lÃ³gico sin cambios, errores vacÃ­os,
worker activo, sin fallbacks/fallos/discards ni frames con documento oculto.
Las instalaciones del primer diagnÃ³stico costaron aproximadamente 4â€“7 ms.

El cambio reduce claramente los bloqueos largos locales. **No establece 60 FPS
ni fluidez completa**: quedan picos de primera compilaciÃ³n/draw y frames de
50â€“83 ms. No se atribuye el resultado a un incremento de FPS medio. La variaciÃ³n
de A1/A2 y las campaÃ±as CPU impiden generalizar un porcentaje global de mejora.

`candidate-b1-sabana.json.gz` aplica solamente la correcciÃ³n de `getError`: 20 frames
>100 ms, pero conserva p99 de 382.6 ms. Los diagnÃ³sticos opcionales identifican
por separado los clones restantes antes de aplicar la segunda correcciÃ³n.

## RegresiÃ³n adicional y alcance

Gran RÃ­o/Mapungubwe, 15 s / 180 m, mismo perfil: p95 66.5 ms, p99 83.1 ms,
mÃ¡ximo 99.7 ms, cero frames >100 ms; 15 chunks nuevos / 40 totales, snapshot
sin cambios y errores vacÃ­os. No tiene referencia A pareada: es regresiÃ³n
funcional/visual, no otra demostraciÃ³n de mejora.

Capturas reales A1/C1 muestran la misma composiciÃ³n final de Sabana; se revisÃ³
tambiÃ©n Gran RÃ­o. Son vistas puntuales, no una comparaciÃ³n multivista exhaustiva
ni garantÃ­a de ausencia de popping durante todo el recorrido.

Las timer queries rodean `world.render`, **no todas las preparaciones asÃ­ncronas
entre frames ni compositor/presentaciÃ³n**. EXT estuvo disponible, sin disjoint.
Los datos GPU originales se conservan, sin afirmar ahorro GPU total. Los contadores
de geometrÃ­as/texturas/programas no son medidas de RAM/VRAM del driver.

51 pruebas dirigidas pasan: copia/retenciÃ³n/liberaciÃ³n de metadata y materiales,
fence, fallos diagnÃ³sticos, cancelaciÃ³n/contexto, correspondencia de preparaciÃ³n,
terreno/costura y sustituciÃ³n de regiones. Build Vite pasa (13.50 s).
Los logs comprimidos y hashes acompaÃ±an los JSON; `node verify.mjs` recalcula
estadÃ­sticas, comprueba artefactos, invariantes y correspondencia de cÃ¡maras.

## Reproducir y seguir

Arrancar Vite, abrir el fixture y pulsar **Iniciar recorrido** cuando indique
`ready`. ParÃ¡metros: `biome`, `culture`, `quality`, `seconds` (5â€“120), `speed`
(0â€“40; cero sirve como control quieto), `angle` en grados, `noGpu`. `trace` aÃ±ade
instrumentaciÃ³n CPU de renderer, construcciÃ³n y materiales; `glTrace` registra
llamadas GL >2 ms. No comparar diagnÃ³sticos instrumentados como brazos sin trazas.
Al acabar, pulsar **Cerrar escena** y cerrar la pestaÃ±a antes del siguiente brazo.
La escena continÃºa dibujÃ¡ndose tras medir para permitir capturas; no sumar esos
frames a la mediciÃ³n. Todas las pestaÃ±as usadas aquÃ­ quedaron cerradas/dispuestas.

Pendiente: otros biomas/calidades, trayectorias laterales/giro, fincas densas y
continuadas, mÃ³vil fÃ­sico, atribuir los picos residuales y distribuir las primeras
compilaciones/uploads. Preservar determinismo, fences de handoff, representaciÃ³n
anterior durante preparaciÃ³n y exactitud entre impostor/modelo; no reducir la
calidad para presentar una mejora como si fuera equivalente.
