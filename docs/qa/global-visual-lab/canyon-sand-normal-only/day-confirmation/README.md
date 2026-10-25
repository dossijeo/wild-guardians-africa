# Confirmación diurna con calentamiento ampliado

Resultado favorable al presupuesto en este recorrido: no se observa sobrecoste GPU relevante de normal-only frente a grava. No acredita todos los encuadres o perfiles ni sustituye la validación visual temporal.

Intel UHD 0x9A60, ANGLE D3D11, WebGL2, calidad baja, 1280×720, Gran Cañón semilla 712, día 150. A/B/A/B en páginas nuevas: A grava .08; B receta completa de arena seca normal-only. Ambos global-lighting y warm-floor. Se amplía calentamiento de 30 a 180 frames por medición y muestras de 120 a 240 GPU, con 240 frames separados de CPU/cadencia. Mismo movimiento determinista del benchmark anterior; no es el recorrido de aproximación de motion-close.

960 muestras GPU y 960 frames de cadencia. Auditoría verifica cámara/draws/triángulos por frame, objetivo/hora/dispositivo iguales, simulación sin cambios, ausencia de errores GL y consultas válidas sin disjoint, descartes o pendientes. No capturas ni codificación simultáneas propias. Otros procesos de trabajo estaban abiertos; no hubo aislamiento ni control térmico. No se detuvieron procesos ajenos.

| Dos medias de bloque, ms | Grava | Arena normal-only |
|---|---:|---:|
| GPU | 6.621 / 6.719 | 6.589 / 6.767 |
| CPU render | 3.425 / 3.579 | 3.282 / 3.499 |
| Cadencia | 16.627 / 16.629 | 16.627 / 16.628 |
| Cadencia p95 | 17.0 / 17.0 | 17.2 / 17.1 |

Diferencias GPU de cada pareja consecutiva A/B: -0.032 y +0.048 ms; diferencia agrupada +0.008 ms (~0.12%). Son medias descriptivas de dos bloques, no intervalos de confianza ni demostración de aceleración. El control varía 0.098 ms entre bloques, frente a 1.91 ms en la serie anterior. El mayor calentamiento coincide con menor variación, pero no prueba que fuera su única causa. CPU excluye simulación; cadencia no mide presentación y está limitada aproximadamente a 60 Hz. Uploads assetGroups 2.525/frame iguales, no todo tráfico GPU. No se midió VRAM.

Conservar la candidata: volumen cercano documentado previamente y presupuesto favorable aquí. Antes de integrar, revisar coste con arena ocupando más pantalla, transición temporal completa y streaming prolongado. No extrapolar a calidad media, seis biomas ni cobertura global. Original sigue por defecto, main intacto.

## Reproducción

```powershell
node tools/experiments/measure-canyon-sand-day-confirmation.mjs
python tools/experiments/audit-canyon-sand-day-confirmation.py
```

Vite 5190, Chrome/Playwright. [Datos completos](benchmarks.json), [resumen](summary.json). Esta serie conserva las anteriores; no selecciona silenciosamente solo las mediciones favorables.
