# Fundido cercano junto al agua: piloto de Gran Río

Original con tramado a la izquierda; candidata de superficie cercana con profundidad estándar a la derecha:

- [Día, fase parcial](day-0004-pair.webp)
- [Noche, fase parcial](night-0004-pair.webp)
- [Día, salida](day-0008-pair.webp)

36 capturas reales de campaña, 18 parejas: semilla 712, calidad baja, resolución 1280 × 720 por variante, día 150 y noche 350. Nueve posiciones de cámara alrededor del río; mismas posiciones, objetivo, reloj de viento y valores de ocultación A/B. Simulación pausada, pasos visuales de 1/30 s; no es un vídeo ni una medición de FPS. Se conserva el mismo material del río y de la hierba, sin activar el candidato de desgaste de Gran Río.

La auditoría comprobó igualdad de cámara, hora, viento, lista completa de opacidades y geometría de cobertura herbácea; ausencia de imágenes vacías y errores GL. 12 parejas son RGB idénticas. Las otras seis muestran diferencias de representación. Máximo de dos instancias parcialmente ocultas y tres draw calls adicionales. En la posición 4 diurna: 66 → 69 llamadas y 728.728 → 735.596 triángulos enviados, incluyendo la profundidad auxiliar; no son modelos nuevos.

En las muestras diurnas 2, 4 y 8 inspeccionadas, la candidata quita la cuadrícula en la vegetación parcial, pero mantiene el aspecto translúcido intermedio. El agua sigue visible. **No se ha demostrado un cruce significativo de la geometría parcial sobre el agua**: las diferencias revisadas se encuentran principalmente en la orilla. No usar este piloto como aprobación de composición transparente.

Además, `paintedWaterMaterial` crea un `MeshStandardMaterial` opaco en `src/rendering/african-toon.js`. Por ello, incluso un cruce adecuado con esta agua no comprobaría los riesgos de las partículas transparentes dibujadas después de la profundidad auxiliar. La candidata sigue sin aprobación global: quedan transparencias reales, objetos parciales superpuestos, ciclo de vida y streaming.

No se midieron tiempos CPU/GPU nuevos en este piloto de capturas. El coste temporal anterior sigue documentado en [comparación con el original](../obstruction-surface-blend/README.md) y [profundidad estándar](../obstruction-depth-only/README.md); no extrapolar sus tiempos de Sabana a Gran Río.

[Trazas](captures.json) · [Auditoría de parejas](comparison.json)

## Reproducción

Con Vite en 5190:

```powershell
node tools/experiments/capture-obstruction-water-pilot.mjs
python tools/experiments/package-obstruction-water-pilot.py
```

Los PNG fuente quedan locales. Se publican las trazas y pares WebP seleccionados. El comportamiento original permanece por defecto, sin cambios en main ni en simulación.
