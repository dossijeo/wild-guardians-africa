# Cadencia nativa: corrección del protocolo

La candidata sigue siendo QA. Este pase corrige dos sesgos antes de medir su coste en campaña. No modifica código de producción ni aprueba rendimiento.

- Piloto interrumpido: 12 bloques. Cuatro cambiaban estado pese a la pausa QA; se conserva `../campaign-cadence-pilot.json.gz` y se excluye de conclusiones.
- Diagnóstico de dos bloques: el tutorial avanzaba de introducción a centro, creaba un evento y guardaba la partida. `../campaign-diagnostic-pilot.json.gz` conserva las rutas exactas modificadas.
- La pausa existente `menu` detiene también esa presentación. No se modifica la simulación.
- Un segundo piloto, seis bloques, quedó excluido tras observar relieve candidato en una región lejana del control. Esperar una sola vez a chunks/horizonte no estabilizaba todos los materiales antes de guardar A/B. Se conserva `../campaign-residency-pilot.json.gz`.
- El protocolo ahora prepara cuatro ciclos de render/espera de chunks y horizonte antes de tomar las instantáneas; comprueba pertenencia de materiales, estado completo y residentes al final de cada bloque. Las capturas corregidas ya no muestran la región contaminada.

## Validación corta

Intel UHD, Chrome, 1280×720, semilla 712, Desierto/Mapungubwe, día, calidad media. Dos bloques A/B, 60 fotogramas previos y 240 medidos por bloque, observando el callback RAF real de la aplicación. Cámara móvil corta determinista, partida pausada, sin temporizadores GPU, readback o consultas GL durante la medición.

480 fotogramas válidos: misma cámara, objetivo, draw calls y triángulos por índice. Estado completo sin cambios; materiales y chunks residentes estables; ningún error registrado. [Datos](results.json). Capturas RGB conservadas sin pérdida: [original](media-day-base.webp), [candidata](media-day-candidate.webp).

Intervalo medio observado: 28,199 ms original y 27,576 ms candidata. **No demuestra una aceleración**: es una única pareja de diagnóstico, con otras cargas del escritorio sin controlar. El tiempo CPU incluye observación QA; no mide GPU ni memoria física. La cámara no prueba streaming lejano ni simulación activa.

## Reproducción

Servidor Vite del worktree en 5190. En PowerShell:

```powershell
$env:WG_COVER_QUALITY='media'
$env:WG_SAND_PHASES='day'
$env:WG_SAND_ORDER='0,1'
$env:WG_SAND_OUTPUT='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/campaign-settled'
node tools/experiments/benchmark-desert-sand-campaign.mjs
```

Sin las tres primeras variables, el protocolo ejecuta media/baja, día/noche y ABBA BAAB. La serie completa corregida se está ejecutando separadamente en `campaign-final`; no se mezcla con estos pilotos. Siguiente puerta: auditar los 32 bloques, revisar las capturas y valorar el presupuesto acumulado. La calidad global de seis biomas sigue pendiente.
