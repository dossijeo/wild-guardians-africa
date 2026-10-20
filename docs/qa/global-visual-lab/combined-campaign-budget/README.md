# Presupuesto conjunto en campaña

**No promover todavía el conjunto a la ruta normal del juego.** La serie completa pasa la auditoría: 48 bloques, 5.760 muestras GPU válidas y 8.640 frames de cadencia. No aparecen errores registrados ni diferencias de cámara, objetivo, hora o geometría entre variantes. Sin embargo, la estabilidad del perfil bajo no queda acreditada.

Los controles sin cambios también fluctúan: Sabana nocturna pasa de medias GPU de15,68–17,60ms en A a19,44–23,18ms en B, pese a ejecutar la misma receta. Volcanes nocturno presenta una discrepancia similar, menor en términos absolutos. No atribuir estos deltas a una modificación inexistente ni corregir las otras cifras restando el control: se midieron en momentos y escenas diferentes.

Manglares merece especial cautela: GPU diurna A8,40–12,88ms frente B11,56–13,43ms; nocturna A11,18–11,62ms frente B13,56–16,64ms. La señal de mayor coste concuerda con una ruta material más compleja, pero esta serie no aísla causalmente toda su magnitud. Las medias de cadencia diurna B23,20–24,66ms y p95 de47,5–52,8ms impiden aprobarla para el perfil modesto.

Gran Río y Cañón tampoco se deben presentar como aceleraciones: hay grandes variaciones entre bloques y los controles demuestran deriva. Conservar sus mejoras como candidatas visuales QA. El problema global más claro es que la receta ya retenida de Sabana no mantiene un presupuesto de16,7ms en este escenario bajo; no seguir añadiendo coste sobre ella sin revisar cobertura y estabilidad.

**Siguiente decisión:** mantener el inicio original y las tres candidatas optativas. Priorizar una reducción medida del coste de cobertura en Sabana que conserve continuidad desde la cámara normal, y una ruta menos costosa para la mezcla de Manglares. No repetir esta misma serie para buscar un resultado favorable. La calidad global de los mockups sigue pendiente.

[Datos completos](benchmarks.json), [resumen por bloque](summary.json). El piloto Gran Río permanece separado; no se mezcla con estos resultados. Los rangos anteriores son medias de los dos bloques por variante, no extremos de muestras sueltas ni intervalos de confianza.

## Protocolo

Intel UHD, Chrome headless, WebGL2, 1280×720, DPR1, semilla712, calidad baja. Se inicia una campaña real desde el menú por bloque y se estabilizan chunks, horizonte y actores. Cámara normal fija; simulación pausada mediante la pausa de menú. Día150 y noche350, día1. Cada bioma utiliza páginas nuevas en orden base/combinada/combinada/base; cada página mide día y noche.

A conserva la receta global anterior. B añade frontera de desgaste de Gran Río, mezcla barro/musgo con interior toon de Manglares y escala0,08 de grava en Gran Cañón. Sabana, Volcanes y Desierto son controles sin cambio de receta. No es una comparación con main ni una evaluación WebGPU.

Cada condición registra 30 frames de calentamiento y120 muestras GPU alrededor de world.render; después otros30 de calentamiento y180 frames sin consultas GPU para CPU de render e intervalo entre llamadas. El viento avanza por índice de frame con fuerza8. No se realizan capturas ni compresión durante el benchmark. Las capturas comparables están en [revisión conjunta V2](../combined-campaign-review-v2/README.md).

La auditoría exige48 bloques, orden ABBA, cámara/objetivo/hora iguales,1280×720 y contadores de draw calls/triángulos idénticos por frame dentro de cada condición. Rechaza errores GL, consultas GPU inválidas o pendientes y cambios en el subconjunto de estado registrado.

## Límites

La CPU registrada solo cubre world.render, no simulación ni preparación completa de un frame. El intervalo entre entradas al render no es una medida directa de presentación. Las consultas GPU no se usan para medir cadencia normal. La cámara fija no evalúa streaming, selección durante movimiento ni picos de carga. El snapshot de estado comprende día, hora, elapsed, estructuras, trabajadores y plantas; no demuestra invariancia de todo el estado del juego.

Los contadores de memoria de Three son cantidades de objetos, no VRAM medida. No hay control absoluto sobre otras cargas del escritorio ni temperatura/frecuencias. Dos bloques por variante y condición permiten observar dispersión, no establecer una garantía estadística para todos los dispositivos.

## Reproducción

Con Vite del laboratorio en5190:

```powershell
node tools/experiments/measure-combined-campaign-budget.mjs
python tools/experiments/audit-combined-campaign-budget.py
```

El capturador acepta WG_COVER_QUALITY y WG_REVIEW_BIOMES para acotar una prueba. La auditoría requiere declarar el mismo subconjunto con --qualities y --biomes; su valor predeterminado exige los seis biomas en baja. El piloto Gran Río se conserva aparte y no se mezcla con la serie completa:

```powershell
python tools/experiments/audit-combined-campaign-budget.py --directory docs/qa/global-visual-lab/combined-campaign-budget/pilot-river --biomes gran-rio
```
