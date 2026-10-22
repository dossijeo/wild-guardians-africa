# Gran Río: cauce principal y orilla, 22 octubre 2026

La revisión anterior de seis biomas mostraba una charca en Gran Río. Este ensayo apunta explícitamente al centro del río (`riverX(102)`, z=102), conservando semilla 712, media, 1280x720, horas 150/350 y las tres perspectivas. Se comparan original, worldbank (orilla suave) y corebank (misma orilla con interior opaco). Son 18 capturas reales, sin errores WebGL/consola registrados.

## Resultado visual

Worldbank rompe la unión abrupta del agua con la hierba, pero aún no aporta una ribera materialmente convincente: falta transición de suelo húmedo/sedimento y la suavidad puede parecer desenfoque. Corebank es RGB idéntico en cuatro vistas; las otras dos difieren en **ocho píxeles** cada una (vista 0, día/noche, zona y=121–128). La causa precisa de esos píxeles no se ha aislado. No declarar equivalencia píxel a píxel total. La comparación original/worldbank nocturna vista 0 tiene 2491 triángulos de diferencia, de modo que se excluye de conclusiones de trabajo equivalente. El resto de contadores y todas las cámaras se registran en audit.json.

## Coste del interior opaco

[Datos ABAB Intel UHD](../river-channel-bank-cost-20261022/summary.json): 720 consultas GPU válidas, 60 fotogramas de calentamiento y 90 muestras por fase. CPU/cadencia en pasada separada, mismo recorrido de cuatro unidades. Simulación pausada y streaming suspendido en ambos brazos. Los contadores coinciden entre repeticiones de la misma variante; corebank añade deliberadamente draws/triángulos enviados. Ningún error/disjoint/pendiente. No mide creación de mapas ni latencia de streaming.

| Fase | GPU worldbank → corebank (ms) | CPU envío worldbank → corebank (ms) |
|---|---:|---:|
| Día 1 | 16,134 → 17,678 | 4,518 → 4,849 |
| Día 2 | 17,145 → 16,131 | 4,567 → 5,058 |
| Noche 1 | 16,537 → 17,452 | 4,466 → 4,621 |
| Noche 2 | 17,494 → 17,189 | 4,576 → 4,648 |

La GPU cambia de signo y la CPU aumenta 0,07–0,49 ms. **No generalizar la optimización del Cañón a Gran Río** con estos datos. Esto no descarta las orillas suaves ni el resultado artístico; indica que el interior opaco debe tener una política específica por escenario/bioma.

## Ensayos de sedimento

[Franja continua](../river-sediment-bank-review-20261022/comparison-day.jpg): usa profundidad del mapa y mezcla color de sedimento antes de la iluminación del agua. La respuesta día/noche se conserva, pero aparece una banda oscura uniforme: **no adoptar**.

[Depósitos discontinuos](../river-deposit-bank-review-20261022/comparison-day.jpg): ruido regional, menor anchura y color menos oscuro. Evita el contorno oscuro continuo, pero la contribución desde cámara de juego es insuficiente. Conservar como ensayo, **no presentarlo como orillas terminadas**. Ambas variantes tienen seis parejas con cámaras/calls/triángulos iguales y sin errores. Añaden una consulta del mapa de altura en el shader del agua; no se ha medido su coste GPU ni se afirma que sean gratuitas.

La siguiente intervención debe tratar el material del terreno en la ribera (la cara terrestre de la unión), reutilizando humedad/cobertura o un mapa de orilla, en lugar de seguir tiñendo solo el agua. Mantener el interior opaco como candidato del Cañón y continuar validando Manglares, charcas y lava por separado. Desierto no tiene agua natural y sus sombras aprobadas permanecen intactas.

## Reproducción

Con Vite en 127.0.0.1:5190, ejecutar de forma secuencial:

- node tools/experiments/capture-river-channel-bank-20261022.mjs
- python tools/experiments/package-river-channel-bank-20261022.py
- node tools/experiments/measure-river-channel-bank-cost-20261022.mjs
- python tools/experiments/audit-river-channel-bank-cost-20261022.py
- node tools/experiments/capture-river-sediment-bank-20261022.mjs
- node tools/experiments/capture-river-deposit-bank-20261022.mjs

Todo sigue siendo QA en codex/global-visual-lab; no hay integración en main ni cambios de simulación/navegación.
