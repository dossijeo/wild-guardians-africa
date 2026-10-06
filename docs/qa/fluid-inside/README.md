# Consulta booleana de agua/lava

Referencia congelada: main `513317c`, recuperada con `git archive` para src, content, public/content, package.json y las herramientas de apertura/carga integrada.

La navegación y la validación de construcciones solo necesitan saber si un punto ocupa un fluido. `TerrainField.fluidInside` evita calcular la orilla y el nivel final de `waterInfo`, puede terminar al encontrar fluido y descarta charcos circulares alejados mediante sus ejes normalizados antes de conservar el mismo test circular estricto. No aproxima alturas ni añade cachés. `waterInfo` permanece disponible sin cambios para renderizado, niveles, ambiente y humedad. Los adaptadores que sustituyen waterInfo o pondMetric conservan la consulta completa.

En Manglares, `fluidAt` conserva la consulta completa: el primer experimento booleano no mostró una mejora clara sobre el coste dominante de la máscara. La prueba específica impide que gameplay llame a esa variante en el manglar.

## Evidencia

- 75 pruebas dirigidas y 453 ampliadas correctas de fluidos, terreno, navegación, puertas, murallas, actores, trabajadores y mundo.
- 117.612 puntos de terreno natural (seis biomas y dos seeds), además de bordes de charcos y 1.734 puntos de poblados: ocupación booleana idéntica a `waterInfo(...).inside`. Se incluyen suelo seco y fluido real en cada bioma aplicable, fracciones y límites estrictos. Se verifican las restricciones de centros/murallas, desplazamiento seguro y adaptadores.
- Doce comparaciones nativas completas con la referencia: seis jornadas iniciales pagadas de ocho plantas/dos trabajadores durante 2.000 pasos de 0,05 s y seis incursiones de fincas pobladas durante 600 pasos de 0,05 s. Estado serializado idéntico en cada paso. Mapungubwe; no acredita todas las culturas ni cien noches. Preserva las limitaciones previas de accesibilidad de Gran Cañón.
- Benchmark aislado mediante las funciones `fluidAt` reales de referencia y candidato: 1.089 puntos por bioma, diez repeticiones por muestra, tres calentamientos y diez muestras alternadas. Medianas en ms:

| Bioma | Referencia | Candidato |
| --- | ---: | ---: |
| Sabana | 15,13 | 5,26 |
| Gran Río | 14,82 | 5,51 |
| Manglares (consulta completa) | 8,19 | 8,23 |
| Volcanes | 14,63 | 4,15 |
| Gran Cañón | 7,91 | 5,74 |
| Desierto | 0,99 | 0,61 |

- Escenario integrado CPU: 32 cultivos y ocho trabajadores pagados mediante crédito QA explícito, seguido de cinco animales. Dos pares de calentamiento, ocho pares alternados. En cada proceso: 1.630 pasos, 146 búsquedas y trayectoria idéntica SHA-256 `dcad397bf6e0b9cffbffac9da7fa696adfd60770d8d24d6d90fe4d8e018d07f9`. Medianas: tiempo total 3.570,02 → 3.354,97 ms; máximo tick 509,72 → 420,94 ms.
- Build y paquete web correctos: 587 archivos, 388.201.740 bytes, 859 enlaces relativos y veinte GLB distribuidos. Auditoría SFX sin cambios de asignación.
- CI completo de la referencia `513317c`: run 37405354823, 2.157 pruebas correctas. Su log se conserva como evidencia del baseline; la revisión nueva requiere su propia CI.

## Reproducción y límites

`node tools/benchmark_fluid_inside.mjs <referencia-congelada>`; `node tools/benchmark_prop_query_integrated.mjs <referencia-congelada>`; `node tools/check_navigation_query_reuse.mjs <referencia-congelada>`.

Estas mediciones son CPU y conservan procesos de campaña activos en segundo plano. Incluyen arranque y serialización/hash de QA en el ensayo integrado. No son FPS, GPU, móvil ni equivalencia visual de todas las combinaciones. La diferencia diminuta de Manglares no acredita una ganancia; se mantiene su algoritmo original. El pico de rutas aún supera 400 ms en este escenario: queda pendiente distribuir o reducir las búsquedas únicas costosas.
