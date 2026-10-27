# Nueva línea base tras integrar main

Estado: seis series medidas. Gran Cañón en calidad media requiere aislar diferencias de carga entre repeticiones; sus tiempos son provisionales. Streaming y cierre de integración pendientes.

Main: b2497b069 (PR #212). Laboratorio: merge 5cf14fc65, validación 5248ea85b. Intel UHD, 1280×720, semilla712, escena poblada guardada, día/noche, misma cámara móvil, streaming habilitado. A/B/A/B por perfil. GPU y cadencia medidos por separado; CPU es tiempo de render, no toda la simulación.

Main y laboratorio tienen distinta dirección gráfica: el segundo añade cobertura geométrica, iluminación y fondo lejano. Son costes del producto completo, no una optimización de imágenes equivalentes.

| Bioma | Calidad / fase | GPU main (ms) | GPU laboratorio (ms) | CPU main (ms) | CPU laboratorio (ms) |
|---|---|---:|---:|---:|---:|
| sabana | media / day | 16.24–16.41 | 15.91–16.83 | 6.90–7.91 | 8.58–8.82 |
| sabana | media / night | 15.84–16.09 | 17.99–19.39 | 7.24–7.41 | 8.68–10.08 |
| sabana | baja / day | 11.23–11.32 | 12.31–13.93 | 6.97–7.17 | 7.21–8.40 |
| sabana | baja / night | 12.22–14.66 | 14.20–14.31 | 6.73–6.87 | 8.44–8.73 |
| gran-rio | media / day | 14.52–15.57 | 17.15–19.37 | 6.23–7.39 | 8.25–9.08 |
| gran-rio | media / night | 17.06–19.51 | 18.87–20.80 | 6.32–6.42 | 8.17–9.02 |
| gran-rio | baja / day | 11.02–11.32 | 14.03–15.27 | 6.02–6.47 | 7.05–7.65 |
| gran-rio | baja / night | 12.00–12.81 | 15.22–15.67 | 5.72–6.54 | 7.20–7.21 |
| manglares | media / day | 14.96–15.76 | 22.82–23.77 | 6.35–6.56 | 8.21–8.55 |
| manglares | media / night | 17.40–17.53 | 24.19–24.53 | 6.25–7.06 | 8.00–9.08 |
| manglares | baja / day | 9.73–9.78 | 16.42–19.51 | 6.59–7.03 | 7.03–7.35 |
| manglares | baja / night | 11.72–12.70 | 17.51–18.73 | 6.41–6.46 | 7.02–7.29 |
| desierto | media / day | 14.31–14.32 | 16.58–18.79 | 5.28–5.58 | 5.27–5.85 |
| desierto | media / night | 15.30–16.03 | 18.71–21.77 | 4.92–5.07 | 5.12–6.46 |
| desierto | baja / day | 11.24–11.75 | 14.07–14.58 | 5.10–5.12 | 4.20–4.32 |
| desierto | baja / night | 11.43–12.15 | 15.39–15.67 | 4.78–4.87 | 3.83–4.37 |
| volcanes | media / day | 13.99–15.39 | 17.22–17.42 | 6.79–7.19 | 7.24–8.82 |
| volcanes | media / night | 15.91–16.89 | 18.36–20.17 | 6.78–6.91 | 7.60–7.67 |
| volcanes | baja / day | 10.13–10.82 | 15.11–15.46 | 6.29–7.15 | 6.78–7.85 |
| volcanes | baja / night | 12.07–13.00 | 16.89–17.01 | 5.90–6.71 | 7.19–7.65 |
| gran-canon | media / day | 11.44–11.62 | 14.43–16.40 | 6.95–7.26 | 6.73–8.32 |
| gran-canon | media / night | 13.23–13.25 | 16.34–18.07 | 7.23–8.48 | 6.81–6.92 |
| gran-canon | baja / day | 8.31–9.05 | 12.12–13.26 | 5.85–7.64 | 6.41–6.60 |
| gran-canon | baja / night | 9.46–10.05 | 14.15–14.66 | 5.95–6.83 | 6.02–6.25 |

Las seis series contienen 16 registros cada una. Medición completada no implica comparabilidad aceptada.

Los rangos son las medias de las dos repeticiones, no intervalos de confianza. Percentiles, muestras y comprobaciones de carga están en cada summary.json/benchmarks.json. Una secuencia de cámara por fotogramas no equivale a un recorrido de velocidad fija en tiempo real. No convertir estos resultados en FPS de una partida activa.

Sabana: las repeticiones de calidad media conservan exactamente la secuencia de llamadas/triángulos y los recursos iniciales. En baja, tres fotogramas GPU diurnos y uno nocturno difieren en1519triángulos; diferencia acumulada absoluta relativa0,0133% y0,00444%. Las secuencias de cadencia/CPU son idénticas. La interpolación de ocultación usa dt real; es una explicación plausible del desfase, no una causalidad aislada por esta prueba. No se eliminan muestras.

La comprobación visual postmerge preserva los12primeros planos aprobados de Manglares píxel a píxel. Las referencias pobladas de Volcanes anteceden al ajuste de alineación del fondo y no bastan por sí solas para atribuir sus diferencias al merge.

Gran Cañón, calidad media: las repeticiones GPU diurnas difieren en ocho fotogramas, hasta 667262 triángulos en laboratorio y 772361 en main; diferencia acumulada absoluta relativa de 5,69% y 8,37%. También hay diferencias de cadencia. No atribuirlas a la interpolación de ocultación sin aislar la causa. Calidad baja conserva las secuencias. Mantener media como diagnóstico provisional, no evidencia de una ventaja o penalización cuantificada.
