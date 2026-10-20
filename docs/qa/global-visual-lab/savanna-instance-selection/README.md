# Subir matrices solo cuando cambia la selección

Candidata QA posterior al descarte por instancia. A es el prototipo anterior, que invalida el empaquetado con cualquier cambio de matriz de cámara. B comprueba la misma esfera con margen2,5m, pero mantiene una máscara por lote y solo invalida el empaquetado si cambia la selección o el stamp original de matrices/visibilidad/origen. No cambia geometría, LOD, sombras ni cobertura.

La máscara y los temporales pertenecen al objeto de caché del lote; desaparecen al retirarlo. La entrada de comprobación incluye el stamp original y la cámara. No se modifica NativeAssetGroups de producción: ambos parches se inyectan por ruta QA.

## Evidencia

144 capturas,72 parejas,36 poses día/noche Sabana baja,1280×720,semilla712. Cámara/hora/viento y geometría enviada coinciden en todas.68 pares RGB exactos; cuatro con residuos, máximo895 píxeles. No se declara paridad universal ni se atribuyen automáticamente a la máscara. [Diferencias](motion/comparison.json), [pose normal](motion/day-0000-pair.webp), [oblicua](motion/day-0017-pair.webp).

Benchmark independiente en Intel UHD: ocho bloques ABBA,30 calentamientos +120 consultas GPU y30 calentamientos +180 frames de cadencia separados,960 muestras GPU válidas y1.440 frames. Recorrido por índice de frame idéntico a la prueba anterior; sin errores registrados. Auditoría exige cámaras y draws/triángulos iguales por índice entre A/B, además de repetibilidad entre bloques. No se realizan capturas durante medición.

| Medida | A, invalida por cámara | B, invalida por selección |
| --- | ---: | ---: |
| Grupos subidos/frame, día | 48,22 | 13,96–14,01 |
| Grupos subidos/frame, noche | 48,22 | 13,83–14,01 |
| CPU agrupación día (ms) | 1,34–1,67 | 1,30–1,55 |
| CPU agrupación noche (ms) | 1,18–1,69 | 1,28–1,50 |
| CPU render día (ms) | 5,74–6,98 | 5,73–6,41 |
| CPU render noche (ms) | 5,12–6,88 | 5,50–6,18 |
| GPU día (ms) | 11,60–13,32 | 11,75–13,21 |
| GPU noche (ms) | 12,24–14,01 | 11,95–12,73 |
| Intervalo medio día (ms) | 17,65–21,03 | 17,37–18,32 |
| Intervalo medio noche (ms) | 17,46–25,72 | 17,27–19,83 |
| p95 intervalo día (ms) | 29,8–35,6 | 24,9–31,9 |
| p95 intervalo noche (ms) | 24,0–48,9 | 24,6–28,5 |

Rangos de medias de dos bloques, salvo p95 por bloque; no intervalos de confianza. **La reducción de subidas está demostrada; una aceleración general no.** CPU/GPU se solapan entre repeticiones y hay deriva. CPU del agrupador está incluida en render, no sumarla. uploads son grupos actualizados, no medición directa de tráfico GPU.

Conservar B como candidata para validación posterior. No activar globalmente hasta comprobar streaming, cambios de contenido, seis biomas y residuos visuales. El usuario ha pedido explorar transiciones más suaves de ocultación e impostores; esa investigación será independiente para no confundir sus cambios visuales con esta optimización.

## Límites y reproducción

Cámara móvil con objetivo fijo, simulación pausada; no certifica streaming prolongado ni gameplay. Estado comprobado: día/hora/elapsed/estructuras/trabajadores/plantas. Temperatura y cargas externas no controladas; memoria física no medida. Cadencia es intervalo entre entradas al render, no presentación. Los PNG locales contienen todas las poses; se publican seis pares representativos y las métricas completas.

[Datos](motion-performance/benchmarks.json), [resumen](motion-performance/summary.json).

Con Vite5190, ejecutar secuencialmente:

```powershell
node tools/experiments/capture-savanna-instance-selection.mjs
python tools/experiments/package-savanna-instance-selection.py
node tools/experiments/measure-savanna-instance-selection.mjs
python tools/experiments/audit-savanna-instance-selection.py
```
