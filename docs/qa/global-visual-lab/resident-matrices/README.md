# Matrices residentes con selección por identificadores — prototipo QA

Implementación ejecutable en WebGL2 del juego real. Conserva los grupos por recurso/LOD y sus draw calls. Una textura RGBA32F de4texels por matriz guarda transformaciones de instancias lógicas (batch UID + índice original). Un atributo instanciado de IDs selecciona la fila. El vertex shader carga la matriz una vez mediante4texelFetch y la reutiliza para posición, normal y componentes AfricanToon. Cobertura de ocultación sigue en atributo separado; sombras conservan implementación original.

Solo se calculan/añaden matrices al encontrar IDs nuevos. Cambiar el orden del bin LOD puede actualizar IDs y cobertura sin cambiar la textura. La prueba todavía conserva la construcción original de bins/matrices en asset-lod.js: elimina el segundo empaquetado del agrupador, no todo el trabajo CPU. Mantiene cachés por grupo/LOD; recrear grupos/capacidades pierde la residencia. Guarda IDs históricos hasta retiro del grupo, sin compactación del atlas. Cambio de origen limpia el mapa y vuelve a cargar posiciones.

Prueba `node tools/experiments/test-resident-matrices.mjs`: reordenar IDs conserva versión/contenido de textura; origen provoca actualización correcta; textura liberada. Pasa. Instancias nativas estáticas: no soporta editar una transformación lógica manteniendo identidad y matrixWorld; requiere invalidación explícita antes de generalizar. No es ruta de personajes animados.

Capturas reales Sabana baja seed7121280×720, normal/oblicua/inversa día y noche. Calls/triángulos/cobertura coincidentes. Diferencias RGB día92/20/131píxeles, noche252/19/407píxeles; máximos59/35/169 y70/26/121. Normal diurna revisada sin cambio visual grueso, pero ninguna pareja es exacta y la causa no está aislada. No afirmar equivalencia total ni promover aún. Datos captures.json/comparison.json y parejas WebP locales.

Benchmark ABBA completado y auditado. Mide uploads de textura, selecciones y bytes CPU del atlas; esos bytes no son VRAM total. No se ha probado streaming prolongado, límite de altura de textura, estabilidad temporal de residuos ni contexto perdido. Repetir por seis biomas solo tras resolver límites relevantes.

Reproducir con Vite5190, `node tools/experiments/capture-resident-matrices.mjs`, `python tools/experiments/package-resident-matrices.py`, `node tools/experiments/measure-resident-matrices.mjs` y `python tools/experiments/audit-resident-matrices.py`. Sin modificación del renderizador de producción.


## Resultado práctico

960 muestras GPU válidas,1440 fotogramas de cadencia, cero errores/disjoint. Misma trayectoria, calls y triángulos por fotograma; cobertura final y caché65tiles coincidentes. Atlas adicional máximo122880bytes de array CPU; no representa VRAM total ni sustituye los buffers de origen que el prototipo aún mantiene.

| Métrica | Control | Matrices en textura |
|---|---:|---:|
| CPU render día, ms |5.413 /4.790 |6.472 /5.864 |
| CPU render noche, ms |5.258 /4.726 |6.733 /5.287 |
| GPU día, ms |15.824 /15.240 |17.406 /16.535 |
| GPU noche, ms |16.101 /15.416 |20.849 /17.209 |
| Cadencia p95 día, ms |34.5 /27.0 |37.6 /35.8 |
| Cadencia p95 noche, ms |31.5 /29.8 |41.7 /34.4 |

La variante actualiza selección de color8.12–8.24veces/fotograma y sube texturas de matrices3.217veces/fotograma. Son contadores de grupos, no bytes reales; los atlas nuevos/crecidos se suben completos. Reutiliza matrices entre selecciones, pero no garantiza residencia estable: el agrupador sigue retirando lotes sin entradas y recreándolos por capacidad. No compararlos directamente con uploads general, que incluye sombras.

Decisión: no integrar este prototipo. CPU, GPU y p95 empeoran en las cuatro parejas; manteniendo idéntica geometría no aporta calidad adicional que justifique ese coste. Es una prueba de viabilidad funcional con coste negativo, no un límite definitivo de la técnica. CPU todavía conserva empaquetado de origen, genera claves de strings por instancia y administra cachés por LOD; GPU añade4lecturas por vértice. Esta medición no separa causalmente cada coste. Para otra iteración habría que eliminar trabajo redundante real y conservar un atlas por población estática, además de resolver residuos visuales y cambios de transformación.

No se elimina ni reduce ninguna variante artística por estos resultados. El experimento gráfico global y la receta aprobada de Manglares continúan conservados. No prolongar microoptimizaciones sin evidencia de que recuperan presupuesto significativo.
