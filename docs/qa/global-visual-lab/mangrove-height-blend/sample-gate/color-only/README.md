# Aislamiento del muestreo de color y normales

Mantiene siempre la lectura de normales de barro; condiciona únicamente color y su conversión con la protección por altura del ensayo anterior. El control sigue siendo la receta completa aprobada. Opción gateSoilColorOnly desactivada por defecto y exclusiva QA.

12 capturas reales, seis parejas, tres vistas cercanas, baja1280×720, semilla712, día150/noche350. Cámaras, objetivo, hora, llamadas y triángulos iguales; sin errores. [Día](day-pair.webp), [noche](night-pair.webp), [registros](captures.json), [diferencias](parity.json).

Al mantener la normal se reducen los residuos de8–25 píxeles (máximo6–19) a1–11 píxeles (máximo2–7). Las seis imágenes de control de esta ejecución son RGB exactas respecto a las del ensayo height-guard: [repetición del control](control-repeat.json). Por tanto, esa comparación no respalda atribuir los residuos a variación aleatoria de la escena. No demuestra por sí sola si la causa restante está en precisión, derivadas posteriores o compilación.

No hay benchmark de esta variante: conservar una lectura adicional puede modificar el ahorro. Las cifras GPU de height-guard no se transfieren a color-only. Ambas recetas siguen disponibles para comparación temporal. No se sustituye la apariencia aprobada ni se desestima el sustrato por rendimiento.

La prioridad siguiente es comprobar visibilidad temporal de los residuos y medir el coste de la alternativa pertinente, evitando convertir la coincidencia RGB exacta en un objetivo artístico por sí mismo. Unos pocos píxeles diferentes no prueban defecto visible, del mismo modo que una captura similar no prueba estabilidad en movimiento.

Reproducción con Vite5190:

```powershell
node tools/experiments/capture-mangrove-color-gate.mjs
python tools/experiments/audit-mangrove-sample-gate.py docs/qa/global-visual-lab/mangrove-height-blend/sample-gate/color-only
```

PNG individuales locales, pares lossless y trazas publicados. Main, simulación y modelos intactos; objetivo global pendiente.
