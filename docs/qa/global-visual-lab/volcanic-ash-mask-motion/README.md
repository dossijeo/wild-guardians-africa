# Máscara de ceniza: movimiento, recarga y preparación CPU

**Conservar la máscara como alternativa viable para revisión.** La comparación preserva cámara y geometría, y la recarga no desplaza visiblemente los depósitos en la muestra revisada. No demuestra todavía una mejora GPU diurna consistente ni completa la validación del laboratorio global.

- [Procedural / máscara, vista oblicua](day-0017-pair.webp)
- [Procedural / máscara, noche](night-0017-pair.webp)
- [Máscara antes/después de recargar](combined-roundtrip-pair.webp)

144 capturas, 72 parejas: Volcanes, semilla 712, calidad baja, 1280 × 720, día 150/noche 350. Cámara normal → oblicua → inversa, 36 posiciones por fase, dt visual 1/30, simulación y tiempo del material congelados. Coinciden cámara, objetivo, hora, opacidades, llamadas y triángulos en cada pareja. Sin imágenes vacías ni errores registrados. La inspección visual se realizó sobre la pareja oblicua diurna y el regreso nocturno, no sobre reproducción continua de toda la secuencia.

El recorrido de streaming visita desplazamientos `(0,0)`, `(192,0)`, `(192,192)`, `(0,192)`, `(0,0)`. La cámara, objetivo, conjunto de chunks y geometría al volver coinciden con el inicio. El origen interno cambia de `(0,0)` a `(48,0)`. Diferencia residual antes/después: 2.053 píxeles para procedural y 2.094 para máscara; máximo 35 niveles RGB en ambos. No son imágenes idénticas, pero no se observa un cambio amplio de posición de las manchas en la candidata.

## Preparación dentro del navegador

Instrumentación opcional de `ashMask`, desactivada por defecto en la ruta QA:

| Momento | Máscaras creadas | CPU acumulada | Máximo individual |
|---|---:|---:|---:|
| Antes del recorrido | 45 | 33,7 ms | 2,6 ms |
| Después | 130 | 80,3 ms | 2,6 ms |

Las 85 creaciones adicionales suman **46,6 ms**, media aproximada **0,55 ms por máscara**. Son duraciones del cálculo/copia CPU observadas con `performance.now()`, no latencia completa de chunk, tiempo GPU ni coste por frame. No se incluyen transferencia GPU, compilación o trabajo del worker. La instrumentación añade su propio coste pequeño y no estuvo activa en el benchmark previo.

Recursos de la candidata: geometrías `184 → 89 → 93 → 95 → 87`, texturas `54 → 46 → 46 → 49 → 49`, programas `31 → 30 → 30 → 30 → 30`. 25 chunks en cada parada. No hay crecimiento monotónico en esta vuelta; esto no demuestra ausencia de fugas en ciclos repetidos o reaperturas ni mide VRAM.

## Corrección del alcance del horizonte

Se registró `horizonGroup: false` y `unmapped: 0` en ambas variantes al terminar el recorrido. `NativeHorizon.update` solo genera ese terreno adicional para Gran Cañón y Desierto; lo limpia para Volcanes. Por tanto, la transición residente/horizonte que figuraba pendiente **no existe en esta campaña volcánica actual**. No se declara validada. El fallback procedural de la candidata se conserva para posibles contextos sin máscara, pero aquí no se ejercitó.

## Decisión y límites

Esta prueba permite conservar el aspecto y la preparación de la máscara para una opción explícita de revisión. Sigue vigente el [benchmark anterior](../volcanic-ash-mask/README.md): señal favorable nocturna, variabilidad diurna. No se ejecutó un benchmark de frametime en movimiento en esta captura. Faltan ciclos repetidos, calidad media en movimiento y una decisión de integración basada en el coste completo; no activar automáticamente por ser una técnica precalculada.

[Auditoría](analysis.json) · [Capturas](captures.json) · [Recorrido procedural](base-roundtrip.json) · [Recorrido máscara y tiempos](combined-roundtrip.json)

## Reproducción

```powershell
node tools/experiments/capture-volcanic-ash-mask-motion.mjs
python tools/experiments/package-volcanic-ash-mask-motion.py
```

Vite en 5190. PNG y pares no seleccionados locales; trazas completas y pares seleccionados publicados. No cambian simulación, geometría autoritativa ni main.
