# Retornos y liberación de recursos del borde adaptado

36 capturas reales, 18 parejas original/candidata. Manglares, semilla712, calidad media, 1280×720, día150/noche350. Dos circuitos con desplazamientos de 192 unidades, nueve poses por fase, tres visitas al origen. Se verifican cámara, objetivo global, origen de render, chunks, draw calls y triángulos iguales entre variantes por pose. Sin errores GL ni errores registrados. No se cambia la simulación.

[Retornos diurnos de la candidata](candidate-day-returns.webp) · [Retornos nocturnos](candidate-night-returns.webp) · [Control diurno](original-day-returns.webp) · [Registros](captures.json) · [Resumen](summary.json) · [Diferencias entre variantes](parity.json).

La tira diurna de la candidata se inspeccionó visualmente: se conserva la distribución de bordes al regresar. Los retornos nocturnos son RGB idénticos en ambas variantes. Los diurnos no lo son: MAE original 0.003252 y candidata 0.003333/0.003334 niveles RGB respecto a su primera vista. No se ha aislado la causa del residuo; no declarar reproducción diurna exacta. Las diferencias original/candidata son esperadas por el cambio de material y no constituyen por sí mismas una medida de calidad.

## Atributos y recursos

Todas las geometrías de barro cargadas en la candidata tienen qaMudRadius con valores finitos positivos. El control no lo tiene. En las tres visitas al origen: 24 mallas, 24 atributos y 371.100 bytes de arrays adicionales constantes. Es tamaño de datos, no VRAM medida. El número de referencias activas de QA coincide con las mallas de barro cargadas en todas las poses.

Al ejecutar world.dispose, las 24 geometrías restantes de cada variante notifican dispose exactamente una vez y las referencias activas pasan a cero. [Control](media-original-disposal.json) · [Candidata](media-candidate-disposal.json). Esto cubre liberación de geometrías/referencias en este recorrido; no demuestra ausencia de todas las fugas, liberación física inmediata de buffers GPU ni estabilidad durante horas.

Los contadores renderer.info al inicio diurno todavía varían: control 165 geometrías/60 texturas, candidata 165/57. En la última vuelta y las tres visitas nocturnas ambos quedan en 76/48; programas nocturnos constantes en32. No atribuir la diferencia inicial a ahorro de memoria. No se ejecutó un benchmark nuevo: settleMs incluye espera y estabilización y no debe interpretarse como coste puro de streaming.

## Decisión

La variante supera esta comprobación acotada de recarga y referencias, pero sigue solo en QA: el benchmark anterior no acreditó coste estable y falta revisión de movimiento continuo. No elevar la recomendación a integración ni confundir estabilidad de retornos con mejora artística global. La repetición del musgo sigue siendo un problema mayor que este borde.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-mud-sized-streaming.mjs
python tools/experiments/package-mangrove-mud-sized-streaming.py
```

Las capturas usan salto de cámara y espera de chunks, no vídeo ni medición de presentación. PNG fuente locales; tiras y registros publicados.
