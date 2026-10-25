# Lotes de color persistentes por chunk — prototipo QA

Control: agrupador actual por recurso/LOD que empaqueta chunks visibles. Candidato: clave adicional por chunk residente, incluyendo chunks fuera del frustum; se cambia mesh.visible según el frustum sin incluir cámara en el sello del buffer. Geometría, material, sombras y cobertura sin cambios. Cambios de LOD, visibilidad de origen y streaming todavía pueden provocar subidas; no se promete tráfico cero. El origen flotante aún invalida matrices.

Sabana baja, semilla712,1280×720, tres cámaras día/noche. Misma cobertura y triángulos en las seis parejas. Cuatro RGB exactas; día inversa92píxeles máximo159 y noche normal1píxel máximo17. Causa no aislada. Normal diurna inspeccionada visualmente sin pérdida apreciable. Draw calls del control69/76/61 frente a173/162/170, respectivamente. No es la variante de culling por instancia: ambos lados aquí usan visibilidad por chunk.

Benchmark móvil ABBA completado y auditado con `node tools/experiments/measure-persistent-asset-groups.mjs` y `python tools/experiments/audit-persistent-asset-groups.py`. No activar en producción sin medir CPU/GPU, estabilidad y memoria residente. Este prototipo conserva lotes de chunks cargados fuera de cámara y puede consumir más memoria.

Capturas: `node tools/experiments/capture-persistent-asset-groups.mjs`; comparación: `python tools/experiments/package-persistent-asset-groups.py`, servidor5190. Datos locales en captures.json/comparison.json y parejas WebP. Siguiente prueba: verificar subidas y coste de draw calls en movimiento; valorar partición espacial intermedia si por chunk resulta demasiado fragmentada.


## Benchmark móvil completado

960 muestras GPU válidas y1440 fotogramas de cadencia, sin errores/disjoint. Trayectoria y triángulos idénticos por fotograma; cobertura final activa, near/far/triangles/bufferBytes coincidentes. No se reduce calidad para obtener el resultado.

| Métrica | Agrupador actual | Persistente por chunk |
|---|---:|---:|
| CPU render día, ms | 6.425 / 5.596 | 7.445 / 7.810 |
| CPU render noche, ms | 6.164 / 5.092 | 7.644 / 7.323 |
| GPU día, ms | 20.355 / 16.780 | 18.655 / 19.047 |
| GPU noche, ms | 18.483 / 17.729 | 18.861 / 19.298 |
| Cadencia p95 día, ms | 40.0 / 33.6 | 41.8 / 42.6 |
| Cadencia p95 noche, ms | 38.8 / 34.4 | 40.3 / 37.9 |
| Grupos subidos/fotograma | 11.24–11.31 | 17.52–17.60 |
| Capacidad máxima de buffers de instancias contabilizada, bytes | 152736 | 283840 |
| Geometrías al cierre de medición | 169 | 336 |

El primer fotograma medido tiene70 frente a152 llamadas y1196927 triángulos en ambos. El coste CPU y la cadencia empeoran en las cuatro parejas. GPU diurna con deriva del control, sin beneficio consistente. La residencia por sí sola no elimina actualizaciones: el sello sigue dependiendo del LOD, la visibilidad y las versiones de las matrices de origen. El contador de subidas es de grupos, no de bytes: mayor número no demuestra más transferencia total.

Límites: caché de cobertura al cierre65 tiles en control y48 en candidato, aunque cobertura dibujada y triángulos coinciden; no se afirma igualdad de estado de caché ni memoria total. Texturas del primer control60 frente a58 en otros bloques. Los contadores de Three.js no miden VRAM; groupBytes solo contabiliza capacidad de instancias y omite geometría estática. El prototipo crea vistas de geometría con identidades GPU propias por lote, lo que puede duplicar atributos estáticos. La prueba no aísla cuánto aporta cada factor a la regresión. Simulación pausada, CPU de render y consulta GPU separadas de la cadencia; no son tiempos de presentación.

## Decisión y siguiente diseño

No integrar esta versión por chunk. Se conserva la evidencia y toda la calidad artística. La idea de datos residentes sigue siendo válida, pero requiere separar matrices estáticas de selección/LOD/visibilidad, compartir realmente geometría entre lotes y limitar su fragmentación. Una lista compacta de IDs con matrices residentes es otra candidata, con coste de lectura en vertex shader que debe medirse. No generalizar este resultado de Sabana a otros biomas ni presentarlo como límite de WebGL2.
