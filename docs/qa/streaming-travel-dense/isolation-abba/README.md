# Aislamiento de preparación GPU: ABBA denso

Cuatro contextos nuevos secuenciales A1/B1/B2/A2, código f6375089 fijo, sin trace.
Ambos usan precarga residente; B añade aislamiento, A conserva dibujo completo.
Gran Río/Suajili,1257cultivos vivos/34trabajadores, calidadmedia,180m/15s por brazo,
IntelUHD,1280×720/buffer1600×900. Una escena QA activa a la vez; cuatro campañas
CPU de fondo siguen activas. No atribuir equivalencia a aislamiento del hardware.

| Brazo | p95 ms | p99 ms | Máximo ms | Frames >100ms |
|---|---:|---:|---:|---:|
| A1 |166,2|199,5|249,5|40|
| B1 |133,0|149,6|166,2|27|
| B2 |116,4|133,0|133,2|18|
| A2 |149,7|199,6|232,7|40|

Estado/finca/cámara/target/device iguales,15chunks nuevos y cero errores/ocultación
en todos. Queries sin disjoint/pendientes. B muestra mejores colas de intervalos
en ambas repeticiones; todavía no ofrece60FPS constantes ni prueba móvil.
Preparación residente A1283,7/1361,6ms y B992,9/990,8ms; son medidas de esta
fase, no total de inicialización ni mejora general de toda la carga.

Capturas finales: comparar rectángulo x400..1279/y0..719, excluyendo el overlayQA.
RGB medio absoluto A1/B1=0,000423 y A2/B2=0,000654 en escala0..255; máximo6/9,
sin píxeles con diferencia>12. Repetición A1/A2=0,000853/máximo9: la pequeña
variación no supera la del control repetido. Capturas codificadas por navegador,
no framebuffer crudo. Esto acredita ese encuadre final, no múltiples ángulos,
transiciones/dither/sombras dinámicas o ausencia global de popping.

No activar todavía: ampliar a otros biomas/culturas, revisar continuidad durante
traveling y recursos. Informes completos y hashes preservados; el usuario no
solicitó reducir resolución, distancia ni calidad para aprobar la prueba.

Conteos del renderer al último frame: A1/B1/B2=565geometrías/108texturas/76programas,
A2=566/108/76. Son conteos, no bytes RAM/VRAM ni prueba de pico neutro. Todos
incluyen la precarga residente experimental; no atribuir su coste a aislamiento
ni extrapolarlo a la carga normal sin esa precarga.

`node docs/qa/streaming-travel-dense/isolation-abba/verify.mjs` revalida hashes,
cuantiles desde frames crudos e invariantes de estado/cámara/chunks informadas.
No vuelve a ejecutar navegador ni campaña ni demuestra otras condiciones.
