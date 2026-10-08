# Recuentos de urgencia durante una actualización de trabajadores

Referencia congelada `1a23fe1db14cda1bbff4bee5dd632e9445bc98bd`. El perfil de Sabana/Musgum contiene 1343 cultivos vivos y 112 empleados pagados. Tras el pico inicial de rutas (primer tick 2436,71 ms), V8 atribuye 66 muestras / 67,26 ms al trabajo repetido de `urgentWork`. Es muestreo con campañas concurrentes, no una medida aislada del coste de ese método ni un resultado de FPS.

La versión final comparte recuentos únicamente con al menos 64 empleados. Los equipos pequeños conservan la consulta directa. El umbral es una decisión conservadora para amortizar los mapas: no se presenta como un óptimo medido. Dos pilotos de caché incondicional dieron resultados mixtos para 18–47 empleados y están archivados como tales.

Cada actualización síncrona crea su propio ámbito. Solo cuenta empleados de centros consultados; notifica cambios después de cada empleado, incluso con `continue`. Conserva contratos, final de turno, estados excluidos y el umbral estricto de tareas por empleado. Incluye tareas ya reservadas. Reemplazar o cambiar longitud de las colecciones invalida los recuentos correspondientes. No hay caché entre ticks ni datos nuevos en el guardado.

Una reparación de centro puede reasignar varios empleados: ambas rutas de finalización de reparaciones invalidan el ámbito antes de procesar al siguiente trabajador. El helper requiere notificar cambios individuales o invalidar ante cambios colectivos; no es una caché general para mutar centros de tareas in situ manteniendo el mismo array y longitud.

## Comparación final AB/BA

Cuatro victorias históricas archivadas se continúan con comandos reales de postgame y contratación pagada, terreno y navegación nativos. Quince segundos simulados de calentamiento y veinte medidos, `dt=0,1`. Se alterna el orden referencia/candidato cada tick. Los 36 checkpoints de estado completo, eventos y búsquedas de ruta son idénticos. Preparación, serialización, hashing, colección de eventos e IO quedan fuera de la medición.

| Finca / empleados | CPU mediana referencia → final | CPU p95 referencia → final | CPU total referencia → final |
| --- | ---: | ---: | ---: |
| Manglares / 18 | 0,615 → 0,615 ms | 9,131 → 7,737 ms | 459,40 → 511,06 ms |
| Gran Río / 47 | 2,789 → 2,775 ms | 14,164 → 12,943 ms | 915,51 → 909,81 ms |
| Sabana / 46 | 2,464 → 2,272 ms | 14,440 → 16,556 ms | 930,13 → 996,96 ms |
| Sabana Musgum / 112 | 10,022 → 8,704 ms | 45,597 → 43,997 ms | 2915,05 → 2721,82 ms |

En Musgum la mediana baja 13,1% y el total 6,6% en este ensayo. Los otros tres casos mantienen consultas directas y muestran variabilidad; no se afirma mejora uniforme ni significación estadística. Los pilotos grandes también reducen mediana y total, pero no son repeticiones idénticas de la versión final. Las campañas 43808/49032 seguían activas. No acredita GPU, frametime, RAM, móvil, render ni una nueva campaña actual de cien noches. El pico frío de navegación sigue pendiente.

33 pruebas dirigidas cubren locomoción, historial, tareas, reparación y reasignaciones, incluidas alteraciones múltiples tras reconstrucción. Los informes contienen todas las muestras, estados hash y rutas; `manifest.json` verifica toda la referencia `src` contra los blobs del commit y conserva fuentes finales. La indentación de `game.js` se ajustó después de importar la versión del benchmark; fue un cambio solo de espacios.

La excepción de reconstrucción se comprueba además en una fixture artificial de 64 empleados pagados, financiación QA explícita, un centro destruido y rutas rectas de prueba. Veinte ticks tienen estado completo idéntico y 32 reasignaciones; el siguiente empleado conserva su reserva de carrera porque ve a los compañeros recuperados. Una copia que elimina las dos invalidaciones falla en el primer tick (control negativo archivado). No acredita navegación real de esa reconstrucción.

Suite completa: 3138/3138 pruebas, cero fallos, 1130487,98 ms. Incluye las dos fincas activas de cien noches y la matriz de mala gestión de esa suite; no sustituye la aceptación intensiva pendiente de treinta combinaciones ni pruebas físicas. Log íntegro comprimido y verificado.

Build y paquete web correctos: 701 archivos, 859 enlaces relativos, veinte GLB de runtime. El aviso existente de tamaño del bundle continúa.

## Reproducción

Extraer `git archive 1a23fe1d src package.json` en una carpeta de referencia dentro del repositorio, para resolver las dependencias comunes. Crear la carpeta de salida y ejecutar:

```powershell
node tools/benchmark_worker_urgency.mjs <referencia> <salida.json>
node --test tests/work-urgency.test.js tests/locomotion.test.js tests/worker-entity-lookup.test.js tests/urgency-short-circuit.test.js tests/displaced-workers.test.js tests/acceptance-repair-chains.test.js
node tools/check_worker_urgency_reconstruction.mjs <referencia>
node docs/qa/worker-urgency-pass/verify.mjs
```

El perfil V8 se reproduce con `node --cpu-prof --cpu-prof-dir=<salida> --cpu-prof-name=musgum.cpuprofile tools/profile_late_farm.mjs <informe.json> intensive-sabana-musgum-e461b550`.
