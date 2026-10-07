# Grupos de cultivos durante incursiones

Referencia: main `3b8d230`. `targetFor` filtraba todo el historial de plantas por cada grupo y realizaba búsquedas exhaustivas de conectividad. El cambio construye una lista viva por especie una vez por selección y genera celdas espaciales bajo demanda para especies con al menos 64 plantas. Las fincas pequeñas conservan el algoritmo original sobre la lista de su especie. El índice no sobrevive a esa llamada síncrona; destrucción, cosecha, plantación o restauración se reflejan en la siguiente selección.

Se mantiene exactamente el BFS original, ordenando candidatos locales por su posición en el array original antes de comprobar `Math.hypot`. Esto conserva también los empates de distancia de los objetivos. El anillo consultado incluye una celda adicional para el redondeo: `-1e-200` y `1.7` pueden estar en celdas separadas por dos, aunque su distancia calculada sea exactamente 1,7. Coordenadas no representables con celdas enteras seguras y radios no positivos/no finitos usan el algoritmo original.

Medianas aisladas de enumeración de componentes, incluyendo construcción del índice, 30 muestras alternadas tras cinco de calentamiento:

| Finca | Referencia ms | Cambio ms |
| --- | --- | --- |
| 20 plantas | 0,109 | 0,109 |
| 1.200 juntas | 111,35 | 12,23 |
| 1.200 separadas | 197,47 | 9,41 |
| 1.200 mixtas | 83,92 | 12,93 |

`pilot.json` corresponde al primer anillo de nueve celdas, descartado por el caso límite de redondeo. `final.json` usa las 25 celdas conservadoras. No se atribuyen estos tiempos a una incursión completa, navegación, GPU, FPS o RAM. Otras campañas/tests estaban activos durante la medición; los tiempos absolutos dependen de esa carga.

Validación: 49 pruebas dirigidas correctas, incluidas 2.400 comparaciones de grupos con fincas densas/dispersas, IDs duplicados y orden exacto, además de eventos y recarga de incursiones. La comparación integrada completa una jornada en cada uno de los seis biomas, Mapungubwe/seed712, con cultivos mixtos y contratación pagada normal. Coinciden guardados finales, ocho puntos de control muestreados, informes diarios y eventos. Hay entregas físicas en las seis partidas. No acredita 100 noches, todas las culturas, todos los tamaños de incursión ni equivalencia entre puntos de control.

Build y paquete web pasan: 641 archivos, 859 enlaces relativos y 20 GLB runtime. La suite completa iniciada sobre `4c4a9df` todavía sigue activa al escribir esta nota; estos cambios posteriores no quedan acreditados por esa ejecución previa.

Reproducción: `node tools/benchmark_crop_components.mjs <salida.json>`. Para integración, copiar fuentes/herramientas/contenido y sustituir únicamente `src/simulation/raids.js` por los bytes de `3b8d230`; ejecutar `node tools/check_crop_water_integrated.mjs <raíz-referencia> <salida.json>`. Aunque la herramienta conserva su nombre histórico, compara estados completos de ambos mundos; `integrated.json` añade la identificación de las fuentes de incursiones usadas en esta ejecución.

## Incursiones nativas archivadas completas

`raid-window.json` reproduce dos snapshots reales de `raid-traffic-corners`, sin cambiar vida, posiciones, objetivos, presupuesto, reloj, RNG o dinero. La navegación usa los perfiles nativos actuales y residencia derivada de la cámara de continuación. La única diferencia de fuentes entre ambas simulaciones es `raids.js`; el informe registra la auditoría de archivos posterior, los hashes de entrada y el hash del agrupador candidato. No es una nueva campaña generada con el balance actual.

| Caso | Historial / vivas | Pasos hasta cerrar incursión | CPU total referencia → cambio | Máximo referencia → cambio |
| --- | --- | --- | --- | --- |
| Gran Río / Mapungubwe, día65 | 8.399 / 283 | 427 | 527,59 → 551,61 ms | 111,89 → 71,38 ms |
| Sabana / Musgum, día78 | 9.446 / 307 | 283 | 366,82 → 348,54 ms | 85,43 → 98,40 ms |

Coinciden exactamente los estados completos después de **los 710 pasos** de 0,1 segundos, las nuevas selecciones de objetivos y las nueve/tres consultas de rutas respectivamente. Ambas incursiones terminan mediante las reglas normales. El informe conserva cada tiempo y cada cambio de objetivo, además de hashes cada diez pasos y al finalizar.

El resultado de rendimiento completo es **mixto**: Gran Río tarda ligeramente más en total y Sabana ligeramente menos; los máximos se mueven en sentidos contrarios. Tampoco todas las nuevas selecciones son más rápidas. No se afirma una ganancia global ni causalidad para un pico concreto a partir de una sola repetición por caso. La mejora aislada de enumeración sigue siendo válida, pero estos recorridos no prueban que mejore el frametime de una incursión renderizada.

Cada intervalo alterna el orden de ejecución de referencia/candidato. La serialización, comparación, hashes y escritura quedan fuera del tiempo registrado del `tick`, aunque sus asignaciones pueden influir en posteriores pausas del recolector y calentamiento. Otros procesos largos estaban activos. Se incluyen costes de navegación/colisión y lógica; se excluyen renderizado, audio real, GPU y dispositivo físico.

Reproducción: con la misma referencia descrita arriba, ejecutar `node tools/benchmark_crop_components_raid.mjs <raíz-referencia> <salida.json>`. La sonda aborta si difiere un estado, el número de consultas o si no se llega a ejercer una nueva selección de objetivo.
