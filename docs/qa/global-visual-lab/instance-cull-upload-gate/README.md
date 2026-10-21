# Subidas condicionadas al contenido del buffer

Experimento QA, sin modificación del renderizador de producción. Ambos lados usan el mismo culling conservador por instancia. La variante compara matrices Float32 y visibilidad antes de marcar los atributos para subirlos. Sigue calculando la selección y recorriendo matrices en CPU.

## Evidencia

Sabana, Intel UHD, baja, semilla 712, 1280×720, día/noche. ABBA con páginas nuevas, 960 muestras GPU válidas y 1440 fotogramas de cadencia; sin errores/disjoint. Misma trayectoria, draw calls, triángulos y cobertura entre variantes. Capturas estáticas: 4/6 parejas RGB exactas, las vistas inversas difieren 180 píxeles de día y 274 de noche; causa no aislada, no afirmar equivalencia completa.

| Métrica | Control | Subida condicionada |
|---|---:|---:|
| Grupos subidos/fotograma | 48.22 | 10.55–10.63 |
| CPU agrupador día, ms | 2.409 / 2.532 | 2.515 / 2.628 |
| CPU agrupador noche, ms | 2.501 / 2.409 | 2.528 / 2.585 |
| GPU día, ms | 13.848 / 12.006 | 12.353 / 12.188 |
| GPU noche, ms | 14.449 / 12.589 | 13.939 / 12.022 |
| Cadencia p95 día, ms | 51.6 / 54.3 | 53.8 / 53.8 |
| Cadencia p95 noche, ms | 50.1 / 55.4 | 54.4 / 53.9 |

El contador mide grupos marcados para actualización, no bytes ni tráfico real del controlador. GPU mide la consulta del render; CPU no incluye simulación, pausada. Cadencia no equivale al tiempo de presentación. Variación importante entre repeticiones: no hay mejora estable de CPU/p95 demostrada. No comparar estos valores absolutos con sesiones anteriores.

## Decisión

Conservar como diagnóstico, no integrar. Reducir subidas sin evitar la reconstrucción/comparación en CPU es insuficiente. Siguiente alternativa: lotes espaciales residentes, con selección de draw calls y coste explícito del mayor número de lotes. Mantener densidad, modelos y materiales.

Reproducir desde la raíz con `node tools/experiments/capture-instance-cull-upload-gate.mjs`, `python tools/experiments/package-instance-cull-upload-gate.py`, `node tools/experiments/measure-instance-cull-upload-gate.mjs` y `python tools/experiments/audit-instance-cull-upload-gate.py`; servidor Vite en 5190. Datos: `captures.json`, `comparison.json`, `performance/benchmarks.json`, `performance/summary.json`. Imágenes originales locales junto a estos datos.
