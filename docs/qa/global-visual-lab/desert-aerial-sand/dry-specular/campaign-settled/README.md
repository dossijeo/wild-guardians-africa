# Cadencia nativa: correcciÃ³n del protocolo

La candidata sigue siendo QA. Este pase corrige dos sesgos antes de medir su coste en campaÃ±a. No modifica cÃ³digo de producciÃ³n ni aprueba rendimiento.

- Piloto interrumpido: 12 bloques. Cuatro cambiaban estado pese a la pausa QA; se conserva `../campaign-cadence-pilot.json.gz` y se excluye de conclusiones.
- DiagnÃ³stico de dos bloques: el tutorial avanzaba de introducciÃ³n a centro, creaba un evento y guardaba la partida. `../campaign-diagnostic-pilot.json.gz` conserva las rutas exactas modificadas.
- La pausa existente `menu` detiene tambiÃ©n esa presentaciÃ³n. No se modifica la simulaciÃ³n.
- Un segundo piloto, seis bloques, quedÃ³ excluido tras observar relieve candidato en una regiÃ³n lejana del control. Esperar una sola vez a chunks/horizonte no estabilizaba todos los materiales antes de guardar A/B. Se conserva `../campaign-residency-pilot.json.gz`.
- El protocolo ahora prepara cuatro ciclos de render/espera de chunks y horizonte antes de tomar las instantÃ¡neas; comprueba pertenencia de materiales, estado completo y residentes al final de cada bloque. Las capturas corregidas ya no muestran la regiÃ³n contaminada.

## ValidaciÃ³n corta

Intel UHD, Chrome, 1280Ã—720, semilla 712, Desierto/Mapungubwe, dÃ­a, calidad media. Dos bloques A/B, 60 fotogramas previos y 240 medidos por bloque, observando el callback RAF real de la aplicaciÃ³n. CÃ¡mara mÃ³vil corta determinista, partida pausada, sin temporizadores GPU, readback o consultas GL durante la mediciÃ³n.

480 fotogramas vÃ¡lidos: misma cÃ¡mara, objetivo, draw calls y triÃ¡ngulos por Ã­ndice. Estado completo sin cambios; materiales y chunks residentes estables; ningÃºn error registrado. [Datos](results.json). Capturas RGB conservadas sin pÃ©rdida: [original](media-day-base.webp), [candidata](media-day-candidate.webp).

Intervalo medio observado: 28,199 ms original y 27,576 ms candidata. **No demuestra una aceleraciÃ³n**: es una Ãºnica pareja de diagnÃ³stico, con otras cargas del escritorio sin controlar. El tiempo CPU incluye observaciÃ³n QA; no mide GPU ni memoria fÃ­sica. La cÃ¡mara no prueba streaming lejano ni simulaciÃ³n activa.

## ReproducciÃ³n

Servidor Vite del worktree en 5190. En PowerShell:

```powershell
$env:WG_COVER_QUALITY='media'
$env:WG_SAND_PHASES='day'
$env:WG_SAND_ORDER='0,1'
$env:WG_SAND_OUTPUT='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/campaign-settled'
node tools/experiments/benchmark-desert-sand-campaign.mjs
```

Sin las tres primeras variables, el protocolo ejecuta media/baja, dÃ­a/noche y ABBA BAAB. La serie completa corregida se estÃ¡ ejecutando separadamente en `campaign-final`; no se mezcla con estos pilotos. Siguiente puerta: auditar los 32 bloques, revisar las capturas y valorar el presupuesto acumulado. La calidad global de seis biomas sigue pendiente.

## Transición nocturna: referencia después del calentamiento

La primera serie completa corregida terminó al comenzar noche: `tutorial.pending.0` añadió `mechanic.defenses`. Se conserva `../campaign-night-transition-pilot.json.gz` (nueve bloques, excluidos de la decisión). La cola de tutorial responde al cambio manual de hora incluso estando pausada su presentación.

El estado de referencia se toma ahora al terminar los 60 fotogramas de calentamiento. Los cambios de esa fase se conservan en `warmupStateChanges`; los 240 fotogramas medidos siguen exigiendo identidad completa del estado. No se ignoran campos ni se desactiva la comprobación. La serie que estaba en curso fue terminal por error antes de reiniciarse; no se duplicaron procesos por silencio de salida.
