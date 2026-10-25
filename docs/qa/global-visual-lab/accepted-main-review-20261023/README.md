# Comparativa actualizada de los seis biomas

Referencia izquierda: main congelado en b2497b0695218652672c805c40971ea830686e3a. Derecha: laboratorio con las variantes nativas seleccionadas. Manglares capturado sobre d564bd0c6; los otros cinco sobre7bc6a6ba3. Entre ambos commits solo cambiaron herramientas/evidencia QA. No se consultó el remoto de nuevo: esta es una referencia reproducible, no una afirmación sobre el último main remoto.

144 capturas reales: seis biomas, dos renderizadores, tres cámaras, día/noche y una vuelta de calentamiento.72pares con cámara/objetivo/hora/origen/tiempo de simulación/posiciones de trabajadores idénticos;36pares finales. Sin errores de página/WebGL. Los fondos del laboratorio están habilitados y preparados. Simulación pausada; perfiles medios1280x720,semilla712. La receta excluye los experimentos de LOD/preiluminación de helechos no incorporados.

## Capturas finales

| Bioma | Día: normal / elevada / inversa | Noche: normal / elevada / inversa |
|---|---|---|
|sabana|[normal](sabana/main-pair-day-0.jpg) / [elevada](sabana/main-pair-day-1.jpg) / [inversa](sabana/main-pair-day-2.jpg)|[normal](sabana/main-pair-night-0.jpg) / [elevada](sabana/main-pair-night-1.jpg) / [inversa](sabana/main-pair-night-2.jpg)|
|gran-rio|[normal](gran-rio/main-pair-day-0.jpg) / [elevada](gran-rio/main-pair-day-1.jpg) / [inversa](gran-rio/main-pair-day-2.jpg)|[normal](gran-rio/main-pair-night-0.jpg) / [elevada](gran-rio/main-pair-night-1.jpg) / [inversa](gran-rio/main-pair-night-2.jpg)|
|manglares|[normal](manglares/main-pair-day-0.jpg) / [elevada](manglares/main-pair-day-1.jpg) / [inversa](manglares/main-pair-day-2.jpg)|[normal](manglares/main-pair-night-0.jpg) / [elevada](manglares/main-pair-night-1.jpg) / [inversa](manglares/main-pair-night-2.jpg)|
|gran-canon|[normal](gran-canon/main-pair-day-0.jpg) / [elevada](gran-canon/main-pair-day-1.jpg) / [inversa](gran-canon/main-pair-day-2.jpg)|[normal](gran-canon/main-pair-night-0.jpg) / [elevada](gran-canon/main-pair-night-1.jpg) / [inversa](gran-canon/main-pair-night-2.jpg)|
|desierto|[normal](desierto/main-pair-day-0.jpg) / [elevada](desierto/main-pair-day-1.jpg) / [inversa](desierto/main-pair-day-2.jpg)|[normal](desierto/main-pair-night-0.jpg) / [elevada](desierto/main-pair-night-1.jpg) / [inversa](desierto/main-pair-night-2.jpg)|
|volcanes|[normal](volcanes/main-pair-day-0.jpg) / [elevada](volcanes/main-pair-day-1.jpg) / [inversa](volcanes/main-pair-day-2.jpg)|[normal](volcanes/main-pair-night-0.jpg) / [elevada](volcanes/main-pair-night-1.jpg) / [inversa](volcanes/main-pair-night-2.jpg)|

[Resumen diurno](overview-day.jpg) · [Resumen nocturno](overview-night.jpg)

## Lectura visual y alcance

Se inspeccionaron las parejas normales diurnas/nocturnas de los seis biomas. Las otras cámaras están capturadas y verificadas estructuralmente; no se presenta este conjunto como revisión temporal exhaustiva.

- Sabana: fibras geométricas visibles en las regiones herbáceas y mayor definición de sombras; conserva calidez. No toda la superficie debe tener cobertura: permanecen las máscaras de desgaste y ocupación.
- Gran Río: cubierta verde más volumétrica, suelo expuesto más definido junto al asentamiento y mayor separación de sombras.
- Manglares: mantiene los helechos nativos aprobados, masa vegetal continua y orilla integrada; no usa los compuestos precalculados de QA.
- Gran Cañón: paredes estratificadas, sombras y material de ribera más ricos, agua regional y respuesta calmada.
- Desierto: conserva el relieve de dunas/ondulaciones y las sombras aprobadas. No se inventó agua para la escena.
- Volcanes: mayor separación entre ceniza y roca, menos dominante azul durante el día y suelo nocturno más legible. El patrón de lava solo aparece al fondo: estas imágenes no resuelven su revisión cercana.

Esto demuestra diferencias artísticas visibles en escenas controladas, no aprobación automática de todos los biomas ni equivalencia exacta con los mockups. No se alteraron modelos, simulación ni reglas para estas capturas.

## Diferencia de fondos en la referencia

Main desactiva farVegetation con spatialSession/Wild Engine. Por tanto estas imágenes comparan el comportamiento real de ese main con el laboratorio completo, no características idénticas. La prueba de habilitar únicamente el perfil lejano de main falló por field.moisture ausente; documentada en manglares/main-full-background/load-failure.json. No se copiaron adaptaciones del laboratorio dentro de la referencia. Las vistas pobladas miran mayoritariamente al suelo: tener montañas listas no prueba su calidad perceptual en el horizonte.

## Coste y tareas pendientes

summary.json registra draw calls/triángulos del último pase de color. No son tiempos GPU ni el coste completo de sombras; no se deducen FPS de estas capturas. Los benchmarks anteriores, excursiones activas y pruebas de calidad siguen siendo evidencia separada y deben enlazarse en la revisión final con sus límites.

Queda consolidar esos costes y la revisión de horizonte/streaming de los seis biomas antes de recomendar cierre global. Se mantiene pendiente la transición de LOD precalculado; no es requisito para conservar Manglares aprobado si su coste nativo es aceptable. Pantalla de inicio y después microeventos siguen en el orden solicitado. PR159 no se fusiona y main no se modifica.

Reproducción: tools/experiments/capture-accepted-main-populated-20261023.mjs con WG_FIXTURE_BIOME y WG_COMPARE_BACKEND=lab/main. Vite5190/5191. Herramienta de comparación compare-accepted-main-populated-20261023.py BIOMA; package-accepted-main-review-20261023.py verifica los36pares finales y fondos del lab. Los fixtures dedicados de Canyon/Desierto están resueltos en el capturador. PNGs completos locales; parejas/telemetría conservadas en Git.
