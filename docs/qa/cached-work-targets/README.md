# Destinos de VFX reutilizados durante actividad

El gestor conserva el Map entre frames y comprueba todas las referencias e IDs antes de reutilizarlo: sigue siendo O(N). Cambios de estado, identidad/longitud de arrays o IDs reconstruyen el índice. Reemplazos con el mismo ID actualizan solo su referencia cuando los IDs son únicos; con duplicados se reconstruye para preservar la última aparición, incluidos objetos repetidos. Otros campos quedan vivos. La disposición libera el índice y snapshots. Las tareas siguen locales y el planificador sin caché opcional conserva su comportamiento.

Se retienen un Map y cuatro arrays de referencias/IDs. Esto evita reconstrucciones/basura, con coste de metadatos residentes; no acredita ahorro de RAM ni validación O(1).

## Pruebas y diagnóstico aislado

41 pruebas dirigidas correctas ([TAP](tests.tap)): cuatro rigs originales, VFX/cadenas físicas, cambios de igual longitud, IDs, reordenaciones, duplicados/aliases y disposición del gestor. Build correcto con aviso previo de bundle grande ([log](build.log.gz)). 400 entradas de presentación controladas coinciden con `a8f3e37`.

Historial real de 12.201 cultivos; variantes de trabajador/tarea y ediciones controladas, no continuación pagada. Tres rondas de calentamiento y doce medidas alternadas; diez llamadas por muestra. JSON lógico final intacto. [Muestras](benchmark.json).

| Diez llamadas | Antes, mediana ms | Ahora, mediana ms |
| --- | --- | --- |
| Riego activo | 25,25 | 2,65 |
| Sustituir última entrada cada llamada | 24,55 | 2,57 |
| Añadir/quitar entrada cada llamada | 24,72 | 20,59 |

Los casos sin actividad ya eran rápidos; sus diferencias minúsculas no acreditan ganancia. Estos tiempos no equivalen a FPS. La primera versión empeoraba los reemplazos (24,05→29,70 ms): se corrigió antes de adoptar. Se conservan [muestras rechazadas](rejected-rebuild-benchmark.json), [helper rechazado](rejected-rebuild-source.txt) y [primer render](rejected-rebuild-native.json); no acreditan la versión final.

## Finca real renderizada

Cuatro lotes A/B/B/A: mismo guardado, postgame normal, contratación pagada de 18 trabajadoras y simulación/Navigation actuales. Solo cambia WorkVfx de `a8f3e37` frente al actual. Herramientas ocultas, profundidad, cámara, calidad media y sombras iguales. 15 s simulados de calentamiento y 20 medidos: 800 muestras CPU/GPU. Viewport 1280×720, buffer 1600×900, Intel UHD/ANGLE D3D11. Las campañas congeladas PID 20608/36076 seguían vivas; sin otros tests/builds propios concurrentes.

| Lote | Caché | CPU render mediana ms | Intervalo RAF ms | GPU ms |
| --- | --- | --- | --- | --- |
| A1 | no | 47,10 | 68,75 | 63,34 |
| B1 | sí | 43,80 | 67,05 | 61,06 |
| B2 | sí | 52,70 | 74,30 | 60,44 |
| A2 | no | 54,90 | 79,55 | 60,07 |

Reducción modesta de CPU en los pares, con variación temporal considerable; no acredita FPS estables/generales. El trabajo GPU permanece igual: mediana de 637 llamadas/5.135.701 triángulos con todos los pases sumados. No atribuir diferencias GPU al índice CPU ni sumar ambos tiempos.

Cuatro estados completos finales iguales, 89 búsquedas de ruta y las mismas acciones medidas: 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha. Final: 35 s, saldo 841, 18 trabajadores, 186 cultivos vivos. Dos a nueve trabajadores actuando por frame. Se comparan estados finales, no cada intermedio. [Datos finales](native.json), [captura](farm.png), [hashes](proof.json). Consola/WebGL sin errores.

El visor usa advanceReal(0.1) por RAF, no el ritmo variable de producción. Sin audio/HUD/autosave, incursión, móvil ni RAM en bytes. No acredita cien noches actuales ni todos los biomas/culturas. Pendiente coste GPU sostenido y aceptación amplia.

Reproducir: `node tools/prepare_late_farm_render.mjs`, referencia congelada Game/Navigation 1bfd85a disponible para los imports, Vite y botón «Comparar índices de VFX A/B/B/A» en `/tests/browser/late-farm-render.html`. Aislado: `node tools/benchmark_cached_work_targets.mjs`.
