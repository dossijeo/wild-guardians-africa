# Fragmentos: SFX 043 y 046

Se conectan `wall_debris_small` al lote de fragmentos realmente emitidos por el motor DEST y `wall_debris_ground` a sus primeros contactos físicos con el suelo. Los contadores se incrementan en los bucles existentes; no hay recorrido adicional de partículas, cambios de RNG, nuevas partículas ni alteración de trayectorias. El generador Python reproduce la instrumentación.

`BuildingEffects` agrupa los cambios por actualización y comunica el ID y posición mundial del centro. Cargar un edificio dañado o rebobinar sus efectos no reproduce sonidos antiguos. Audio agrupa voces por edificio, limita cada toma a una cada 0,3 segundos, atenúa por distancia y rechaza la reproducción tras descodificación tardía (>0,5 segundos), pausas o cambio de generación de escena. La admisión conserva los límites globales de voces existentes. El catálogo distingue asignación de código de escucha: 94 asignados, 32 pendientes.

## Verificación local

- 140/140 tests dirigidos: física/RNG contrastados con el lab original; las cinco casas originales comunican lotes en coordenadas mundiales; pausa, carga, rebobinado, fuente tardía, cambio de escena y límite de bookkeeping.
- Build terminado correctamente, con el aviso existente de tamaño de chunk.
- Paquete: 641 archivos, 382701814 bytes, 859 enlaces relativos, 20 GLB de runtime, sin copias GLB originales.
- Auditoría de los 126 SFX y verificación de sus derivados Opus/hash/exportaciones correctas. Verificación de GLB correcta respecto a los originales, que conservan avisos/errores previos de conformidad.

`tests.log.gz` y `build.log.gz` conservan los logs locales; `sources.json` identifica las fuentes exactas. La primera ejecución dirigida falló por una fixture sintética sin los ocho focos exigidos por DEST; se corrigió la fixture y se ejecutaron de nuevo las pruebas. La comprobación de paquete prematura leyó dist durante el build; el resultado citado se obtuvo después de su terminación.

La página `tests/browser/destruction-audio.html` intenta comprobar dos AudioBufferSource nativos hasta ended y su liberación, con audio silenciado y emisor sintético, sin mundo 3D. La pestaña 642 permanece en «Cargando módulos», sin informe terminal ni errores visibles de consola; se conserva para continuar, sin reiniciarla por timeout. **Reproducción nativa, escucha perceptual y aceptación en un colapso de partida real permanecen pendientes.** No se marca como completa la revisión de los 126 sonidos.
