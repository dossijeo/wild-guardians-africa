# Coste cercano: opciones integradas de arena

Comparación directa `canyonSand=1` (original) frente a `canyonSand=full` (candidate), ambas con global-lighting. Sin interceptación de materiales de arena. Misma cámara cercana móvil sobre suelo despejado, geometría, distancia, resolución y receta salvo mapa de color. Helper QA de suelo cálido igual en ambas.

Intel UHD0x9A60 ANGLE D3D11, Chrome headless WebGL2, baja1280×720, semilla712, día150/noche350. A/B/A/B,180frames de calentamiento por medición,240muestras por bloque. GPU y CPU/cadencia separados.1920consultas GPU válidas y1920frames de cadencia. Auditoría de estado, dispositivo, cámara y geometría coincidentes por índice; cero errores/disjoint/consultas descartadas o pendientes. [Datos](benchmarks.json), [resumen](summary.json).

| GPU ms | Económica, dos bloques | Completa, dos bloques | B−A |
|---|---|---|---|
| Día |6.600 /6.977|6.936 /6.823|+.335 /−.154|
| Noche |7.308 /7.215|7.129 /6.989|−.180 /−.226|

No hay sobrecoste consistente en este recorrido. No afirmar que añadir textura acelera: variación de bloques, carga externa y frecuencia térmica no controladas. No son intervalos de confianza. El benchmark previo de cámara más amplia mostró coste nocturno+.156/+.311ms; no se invalida ni se promedian ambas series como una única prueba.

CPU render día3.602/3.729 frente2.998/3.345ms; noche3.135/3.318 frente2.878/2.954. La diferencia incluye preparación de grupos y no aísla efecto del material. Cadencia~16.63ms,p95~17.0–17.2ms en ambas; no es presentación ni demuestra coste nulo. Uploads.341667/frame iguales; no tráfico GPU total. Sin VRAM medida ni coste de simulación.

## Recomendación

Conservar la arena completa como opción artística viable del laboratorio y usarla como referencia de calidad en próximas revisiones globales. Las pruebas de imagen, streaming/cierre y coste cercano no justifican abandonar su textura. Mantener económica como alternativa explícita; no se cambia el defecto ni se integra en main.

El alcance sigue acotado a este hardware, perfil y recorrido. Faltan sesiones prolongadas y evaluación conjunta de los seis biomas; no garantiza rendimiento de toda una campaña ni de otros dispositivos. El objetivo visual global permanece abierto.

```powershell
node tools/experiments/measure-canyon-full-close.mjs
python tools/experiments/audit-canyon-full-close.py
```

Vite5190. Simulación pausada, navegación/modelos intactos.
