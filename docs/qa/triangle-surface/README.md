# Consulta de altura por triángulo activo

Referencia congelada: main `b980582`, extraída con `git archive`; hash del archivo y fuentes del candidato adjuntos.

`TerrainField.surface` consulta solo las tres esquinas del triángulo utilizado, en lugar de cuatro. Conserva la fórmula y el orden aritmético de interpolación. No añade cachés ni memoria; el límite de alturas sigue en 12.000 entradas. La inserción y expulsión de entradas puede cambiar al omitir muestras innecesarias: no se afirma igualdad de contenido/orden de caché.

## Evidencia

- 48 pruebas dirigidas y 454 ampliadas correctas. La prueba nueva instrumenta las tres lecturas en ambos triángulos, coordenadas negativas y diagonal exacta.
- 54 chunks de seis biomas: 228.150 muestras Float64 idénticas, 6.718.464 valores Float32 de geometría/color/normales idénticos y 6.400 props procedurales idénticos. Ambas cachés realizan expulsiones y respetan su límite; disminuyen las consultas lattice en todos los biomas.
- Doce escenarios nativos contra la referencia: seis primeras jornadas pagadas con ocho plantas/dos trabajadores durante 2.000 pasos de 0,05 s y seis incursiones pobladas durante 600 pasos. Estado serializado completo idéntico en cada paso. Mapungubwe; las limitaciones previas de accesibilidad de Gran Cañón se conservan.
- Benchmark integrado CPU: 32 plantas y ocho trabajadores pagados mediante crédito QA explícito, seguido de cinco animales. Dos pares de calentamiento y ocho pares alternados en procesos Node separados. Todos conservan 1.630 pasos, 146 búsquedas y trayectoria SHA-256 `dcad397bf6e0b9cffbffac9da7fa696adfd60770d8d24d6d90fe4d8e018d07f9`.
- Medianas: proceso completo 3.455,06 → 3.316,96 ms; mayor tick 435,05 → 392,86 ms. Una pareja empeora su mayor tick: no se promete mejora uniforme. Incluye arranque/serialización/hash de QA y campañas en segundo plano; no mide GPU, FPS ni móvil.
- Build y paquete correctos: 587 archivos, 388.202.075 bytes, 859 enlaces relativos y veinte GLB. Auditoría SFX sin cambios de asignación.
- CI de la referencia b980582: run 37406548374, 2.165 pruebas correctas. Log bruto comprimido con hash; no constituye CI del candidato nuevo.

## Reproducción y límites

`node tools/check_triangle_surface_stream.mjs <referencia-congelada>`; `node tools/check_navigation_query_reuse.mjs <referencia-congelada>`; `node tools/benchmark_prop_query_integrated.mjs <referencia-congelada>`.

La prueba geométrica acredita igualdad exacta de las muestras descritas, no todas las combinaciones de culturas/calidad. Los picos de rutas únicas siguen siendo importantes; este cambio no resuelve por sí solo el frametime. Continúan pendientes la campaña responsable de cien noches, aceptación móvil, escucha y las demás tareas del plan.
