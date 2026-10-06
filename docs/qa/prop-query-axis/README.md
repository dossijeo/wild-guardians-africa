# Descarte por ejes en consultas de vegetación

Referencia: main `67c7484`, recuperada con `git archive` para src, content, public/content, package.json y las herramientas de apertura/carga integrada.

`Navigation.propsAt` conserva el recorrido de chunks y listas, el orden, la identidad de los props, las supresiones y el test circular estricto original. Antes de calcular la norma, descarta posiciones cuya distancia en X o Z ya alcanza el radio de consulta. No introduce cachés, índices ni aproximaciones de distancia; no altera geometría, terreno ni navegación.

## Verificación

- 29 pruebas dirigidas y 377 ampliadas correctas. Incluyen límites circulares estrictos, fracciones, coordenadas negativas, entradas duplicadas, supresiones y límites de chunks en los seis biomas.
- Doce escenarios nativos contra la referencia: seis jornadas pagadas de ocho plantas/dos trabajadores durante 2.000 pasos de 0,05 s y seis incursiones de snapshots de finca poblada durante 600 pasos de 0,05 s. El estado serializado completo coincide en cada paso y las consultas de rutas no cambian. Se preservan las limitaciones previas de accesibilidad de Gran Cañón. Estos casos utilizan Mapungubwe; no acreditan todas las culturas ni cien noches.
- Benchmark aislado: 486 consultas de chunks nativos de los seis biomas, cinco repeticiones por muestra, tres calentamientos, diez muestras en orden alternado. Todos los resultados coinciden antes de medir. Medianas: recorrido original 10,38 ms; descarte por ejes 2,88 ms; índice por celdas 11,94 ms. La opción de celdas se rechaza por su coste y permanece solamente en `tools/experiments/prop-query-grid.mjs`, fuera del runtime.
- Escenario integrado CPU: 32 cultivos y ocho trabajadores pagados desde un crédito QA explícito, seguido de cinco animales. Dos pares de calentamiento y ocho pares alternados, cada proceso con 1.630 pasos y 146 búsquedas. Todas las trayectorias comparten SHA-256 `dcad397bf6e0b9cffbffac9da7fa696adfd60770d8d24d6d90fe4d8e018d07f9`. Mediana de duración total del proceso: 3.665,41 → 3.574,86 ms; mediana del máximo tick: 533,18 → 501,33 ms. Un par registra un máximo ligeramente peor en el candidato: no se promete un límite de frametime ni una mejora uniforme.
- Build y paquete web correctos: 587 archivos, 388.198.297 bytes, 859 enlaces relativos y veinte GLB distribuidos. Auditoría SFX sin cambios de asignación.

## Reproducción y límites

`node tools/benchmark_prop_queries.mjs`; `node tools/benchmark_prop_query_integrated.mjs <referencia-congelada>`; `node tools/check_navigation_query_reuse.mjs <referencia-congelada>`.

Las mediciones integradas incluyen arranque y serialización/hash de QA; no son FPS ni una medición de GPU o móvil. Los procesos de campaña de fondo seguían activos durante el ensayo. El pico síncrono cerca de medio segundo todavía existe. Las búsquedas únicas costosas y el rendimiento físico móvil siguen pendientes.
