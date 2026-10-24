# Matas en campaña — revisión visual y compatibilidad nativa

20/10/2026. Piloto QA en Sabana y Gran Río, aún sin integración habitual. Las matas añaden volumen pequeño en los bordes del asentamiento. El pase corrige dos problemas que la fixture no mostraba: acceso a humedad inexistente en el campo nativo y exclusión incompleta de edificios y claros. La forma sigue siendo rígida en vistas bajas; la calidad global de los mockups no está alcanzada.

## Evidencia final

24 capturas de campaña iniciada desde el menú, semilla 712, cultura Mapungubwe, calidad media, 1280×720 DPR 1, simulación pausada y reloj visual fijo. Tres cámaras (asentamiento, vista general y baja), día 150/noche 350, base global-lighting frente al piloto de matas. No se añaden entidades de juego. Las 12 parejas coinciden en cámara, objetivo, hora, calidad y población; no hay errores de página/HTTP. `comparison.json` registra una llamada y 69.120 triángulos adicionales, 192 instancias y cero texturas adicionales.

- [Sabana antes](sabana-base-overview-day.png) / [después](sabana-candidate-overview-day.png).
- [Gran Río antes](gran-rio-base-overview-day.png) / [después](gran-rio-candidate-overview-day.png).
- [Gran Río de noche antes](gran-rio-base-overview-night.png) / [después](gran-rio-candidate-overview-night.png).
- Vídeos de desplazamiento: [Sabana día](sabana-day-motion.webm), [Sabana noche](sabana-night-motion.webm), [Gran Río día](gran-rio-day-motion.webm), [Gran Río noche](gran-rio-night-motion.webm).

Cada captura solicita seis segundos del canvas real a 30 fps y un recorrido de 12 m, sin incluir el HUD. Los archivos codificados duran entre 5,825 y 5,869 s por el inicio de captura; sus metadatos están en video-metadata.json. Los JSON asociados guardan tiempo, población y matas en transición. La codificación queda fuera del benchmark. Se revisan también fotogramas extraídos; no se considera aprobada definitivamente la sensación de crecimiento causada por escalar las matas.

## Correcciones y descartes

1. La primera ejecución falló con `field.moisture is not a function`. La campaña usa `createSpatialTerrainView`, respaldada por C++, mientras la fixture usaba `TerrainField`. No se cambia ninguna implementación del terreno o navegación.
2. Un arreglo provisional calculaba sólo desgaste con la receta JS, evitando la humedad. `before-footprints/` conserva esa ronda: había 27 posiciones candidatas dentro del margen inicial de las huellas de edificios por bioma. No era apta para integrar.
3. `before-native-mask/` incorpora huellas existentes con margen de 0,65 m, pero la configuración del campo nativo carece de `settlementSite`; la receta JS no recuperaba los claros reales. La auditoría encontró 228 candidatas sobre desgaste alto por bioma. También se descarta esa distribución.
4. El código final lee el canal alfa de la misma máscara RGBA residente de 35×35 que usa el shader, con interpolación bilineal y los mismos centros de texel. No genera otra textura ni modifica el terreno. Además consulta las huellas existentes, excluyendo escudos temporales. `footprint-audit.json` verifica 5.747 candidatas por bioma, cero invasiones de huellas con margen de 0,65 m y cero posiciones con desgaste superior a 0,27.

Los archivos de las dos rondas intermedias documentan resultados descartados; no representan la distribución del módulo final. El modelo Blender de 360 triángulos, los colores, la capacidad y las transiciones se mantienen. No se utilizan recursos externos nuevos.

## Rendimiento

`campaign-performance.json` mide el bucle real de render de campaña: ABBA por bioma y fase, 30 frames de calentamiento y 180 muestras por bloque. Alterna visibilidad; assets y selección siguen residentes en ambos estados. Es coste incremental de dibujo en cámara fija, no coste completo de cargar, seleccionar y dibujar la vegetación durante movimiento. Los resultados se resumen en `performance-summary.json`; no se extrapolan los tiempos de fixture a campaña.

| Bioma | Fase | GPU base ms | GPU con matas ms | Diferencia ms |
|---|---|---:|---:|---:|
| Sabana | Día | 14,414 | 15,727 | +1,313 |
| Sabana | Noche | 14,825 | 15,523 | +0,698 |
| Gran Río | Día | 13,521 | 13,869 | +0,348 |
| Gran Río | Noche | 13,944 | 14,925 | +0,982 |

Los 16 bloques contienen 180 muestras GPU y cámara estable, sin errores registrados. Hay deriva entre bloques (por ejemplo, las bases de Sabana diurna pasan de 13,914 a 14,914 ms); no se interpreta una diferencia entre rondas como aceleración. El coste es demasiado alto para promover por ahora esta mejora visual limitada, especialmente en Sabana. Las dos rondas archivadas contienen sus propias mediciones, que no aprueban la distribución final.

`fixture-regression.json` repite la comprobación funcional tras cambiar la máscara: retirada de siete matas por colocación, restauración de candidatos al quedar en ruinas, capacidad y transición acotadas durante 120 frames por bioma. Sus tiempos de CPU son instrumentación auxiliar, no una nueva campaña de rendimiento controlada. Se comprobaron las sintaxis JS de los módulos y runners modificados. No hay cambios en código de producción que requieran un nuevo build.

## Recomendación

Conservar el acceso a máscaras nativas y la exclusión de huellas como requisitos para cualquier integración. No integrar todavía las 192 matas actuales. Probar menos hojas, más curvas y anchas, para ganar volumen legible con menos triángulos antes de extender el candidato a los otros cuatro biomas. Faltan interacción de campaña con construcciones/cultivos desde la interfaz, recorridos prolongados, revisión temporal completa y presupuesto acumulado del experimento. Este pase no modifica simulación, navegación, balance, reglas, edificios ni sus siluetas; tampoco retoca el atlas del taller.
