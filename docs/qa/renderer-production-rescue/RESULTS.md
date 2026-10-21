# Resultado: rescate JS para revisión de producción

Se propone una PR acotada a dos archivos de producción, conservando Three.js y
el LOD existente. Culling individual de color e invalidación por salida efectiva
se aplican a **todos los presets**, incluido `muy_baja`. No se incorpora Wild
Renderer WASM, LOD nativo, culling diferencial, motor adicional ni cambios de Engine.
El usuario autorizó posteriormente el merge a main una vez listo y validado.

Referencia: `origin/main` `cd6c9af0d350ff1f79cd9a1dea0da0786eca4e2a`.
Las cifras antiguas de 54% y 48→11,4 actualizaciones no son la comparación actual.

## Cambio y dependencias

El agrupador existente descarta color por esfera conservadora de cada instancia
(margen heredado de 2,5 m). Conserva la población independiente de sombras, los
límites originales que Three usa para ordenar dibujos, materiales, clipping y LOD.
Compara los valores Float32 finales antes de invalidar matrices o cobertura;
count es estado de dibujo. Solo sube el intervalo modificado de cada atributo.
Los rangos pendientes sobreviven a frames sin dibujo y se limpian al subir a GL.
No se añade otra representación espacial persistente.

La validación con comandos reales descubrió además un fallo en main: Engine
muta en lugar de sustituir el Set de props suprimidos. El guard por identidad en
syncResidentProps ignoraba esos cambios. Se mueve al llamador por frame; las
llamadas explícitas existentes tras comandos vuelven a comprobar el contenido.
Esto actualiza solo el slot afectado, sin recorrer la población en cada frame.
No cambia semántica de comandos ni consumidores de eventos.

## Método y límites

Chrome 155.0.8059.86, Intel UHD/ANGLE D3D11, 1280×720, semilla 712, materiales reales.
GPU usa consultas disjoint válidas; CPU cubre world.render con simulación pausada.
La cadencia es intervalo entre entradas de render, no presentación del compositor.
No se suman CPU y GPU. Residencia fija de 49 chunks para tiempos en Sabana;
streaming normal se prueba aparte. Memoria se recoge fuera de ventanas temporales.
ABBA alterna main/candidato/candidato/main, día/noche por bloque, calentamiento180.
Las series estrictas exigen exactamente N frames y N consultas GPU. No se recortan
outliers. No hay evidencia para atribuir variaciones a temperatura o frecuencias.

## Rendimiento contra main actual

Medias y p95 en ms por bloque. Normal: 180 muestras GPU y 180 de cadencia por
bloque; densa:180; muy baja:360. GPU y cadencia proceden de ventanas separadas.
La escena densa añade300 cultivos,24 trabajadores,16 animales,3 centros y40 murallas;
es un fixture visual, no una campaña avanzada simulada.

### Normal, media

| Variante/fase | CPU media/p95 | GPU media/p95 | Intervalo media/p95 |
|---|---:|---:|---:|
| main day | 9.92/14.41 | 22.05/36.61 | 29.25/58.31 |
| main night | 7.15/10.32 | 25.35/46.65 | 19.43/31.13 |
| candidate day | 8.03/11.61 | 12.34/16.19 | 16.90/22.01 |
| candidate night | 7.70/10.61 | 13.57/17.15 | 17.30/23.08 |
| candidate day | 7.96/10.90 | 12.55/16.60 | 17.27/23.73 |
| candidate night | 7.67/10.61 | 13.01/16.82 | 17.09/21.50 |
| main day | 7.39/10.60 | 15.47/20.58 | 18.78/36.21 |
| main night | 7.34/10.60 | 16.69/21.67 | 19.21/31.33 |

### Densa, media

| Variante/fase | CPU media/p95 | GPU media/p95 | Intervalo media/p95 |
|---|---:|---:|---:|
| main day | 16.33/21.90 | 54.92/73.07 | 62.40/122.11 |
| main night | 16.46/22.12 | 54.27/70.51 | 64.15/120.72 |
| candidate day | 16.47/21.91 | 52.30/72.99 | 58.25/81.35 |
| candidate night | 18.73/26.91 | 52.11/70.44 | 68.90/126.62 |
| candidate day | 16.13/22.10 | 76.26/114.24 | 57.07/79.17 |
| candidate night | 15.94/20.81 | 49.04/64.38 | 57.04/78.47 |
| main day | 16.78/21.50 | 55.46/74.71 | 62.88/120.48 |
| main night | 15.42/20.90 | 55.37/72.29 | 61.65/124.68 |

### Normal, muy baja; culling activo

| Variante/fase | CPU media/p95 | GPU media/p95 | Intervalo media/p95 |
|---|---:|---:|---:|
| main day | 6.70/9.40 | 10.43/13.55 | 16.63/17.20 |
| main night | 7.79/12.10 | 11.62/14.77 | 16.86/20.81 |
| candidate day | 7.28/10.00 | 8.60/11.70 | 16.63/17.20 |
| candidate night | 6.93/9.20 | 8.94/12.08 | 16.63/17.11 |
| candidate day | 9.72/13.62 | 8.80/12.69 | 17.83/26.21 |
| candidate night | 10.13/16.00 | 10.44/19.64 | 19.20/37.23 |
| main day | 7.43/10.40 | 12.98/28.84 | 17.62/20.33 |
| main night | 6.91/9.21 | 10.94/13.54 | 16.63/17.20 |

En normal/media, triángulos medios pasan de1.206.665 a657.200 (−45,5%);
en densa, de5.168.857 a4.281.378 (−17,2%). La serie normal favorece GPU/cadencia,
pero no demuestra una reducción uniforme de CPU. En densa se conserva el bloque
GPU adverso de76,26ms y la regresión nocturna de cadencia de68,90ms. Muy baja
reduce geometría de650.175 a269.266 y GPU, con un segundo bloque de CPU/cadencia
peor; VSync alrededor de16,7ms también oculta mejoras. No prometer FPS universales.

El barrido independiente `quality-*` conserva las cuatro calidades, también sus
resultados adversos. La excepción que desactivaba culling en muy baja fue descartada:
este equipo no representa las GPUs más débiles a las que sirve ese preset. Las
mejoras quedan activas en los cuatro niveles, según la instrucción del usuario.

### Transferencias y memoria

Diagnóstico GL separado, media, cámara móvil, ambas fases idénticas:

| Variante | Bytes buffer/frame globales | Bytes grupos/frame | Actualizaciones grupos/frame |
|---|---:|---:|---:|
| main |112.512,3|29.323,9|8,33|
| culling con subidas incondicionales (solo QA) |159.081,7|75.893,3|38,77|
| candidato |89.716,8|6.528,4|7,22|

−77,7% de payload de grupos y −20,3% global respecto a main. Son bytes emitidos
por llamadas API bufferData/SubData, no tráfico físico del driver ni tiempo GPU.
Los otros83.188,4bytes/frame son iguales. No usar tiempos instrumentados para FPS.
Con cámara estática, ambos lados tienen cero subidas de buffers/texturas y cero
actualizaciones de grupos: se conserva una propiedad que main ya tenía.

Capacidad exacta de atributos de grupos igual en ambos lados:142.816bytes normal,
181.056 densa. Normal mantiene248 geometrías/75 texturas, densa267/128. Heap JS
recogido por CDP en normal ronda50–51MB y backing storage321,5–321,8MB; en densa
62–64MB y401,5–401,7MB. Incluyen Engine/assets. No son memoria total de proceso ni
VRAM. Repeticiones, swaps y pruebas de retiro/recreación no muestran crecimiento
persistente, pero no constituyen una demostración exhaustiva de ausencia de fugas.

## Corrección visual y mundo

La matriz congelada cubre seis biomas×cuatro presets×día/noche (48 condiciones),
con rotación; series adicionales cubren traslaciones/cortes y cambios de LOD.
Pasan exactamente los contratos de subconjunto ordenado Float32/cobertura de color,
límites de ordenación, matrices de sombras y residencia. Sin errores JS/GL.
**No todas las capturas son idénticas bit a bit**: hay residuos pequeños en Sabana,
también en A/A (hasta32 píxeles; diferencias de canal de hasta25 en esta matriz).
El auditor estricto devuelve fallo y los conserva. La inspección no mostró pérdida
visible de geometría; el contrato estructural pasa, no se afirma igualdad RGB total.
Densa, cámara cercana, día/noche y dos vistas: candidato tiene cero diferencias RGB
en las cuatro comparaciones, además de contratos estructurales exactos.

Comandos reales: centro, tres plantaciones, construir/retirar muralla, eventos
confirmados observados. Cada alta deja un prop obsoleto en main y cero en candidato;
tras retirada ambos tienen cero. Esa corrección intencional se registra aparte de
la equivalencia de escenas sin cambios. No se modifica el mundo para ocultar errores.
Después de los comandos, streaming real de360 frames completa20 peticiones sin
cancelaciones, termina con25 chunks y ningún prop suprimido reaparece. Otro recorrido
compara main/candidato con mismas instalaciones y residencia final. La ruta observada
usa worker:false; no se extrapola una validación de worker:true.

Sombras: población independiente intacta, incluye casters fuera de cámara. Tras
comandos y streaming, las cuatro capturas del candidato con caché de sombras son
exactamente iguales a invalidar esa caché y recalcular. Los controles main también
conservan sus pequeños residuos (7/6 píxeles en dos capturas), sin eliminarlos.

## Ledger y decisión

Datos JSON originales comprimidos sin cambiar bytes (gzip mtime0), configuración,
SHA de fuentes/harness y hashes de imágenes en [evidence](evidence/manifest.json).
Las imágenes sin pérdidas permanecen en test-results local; los scripts las regeneran.
Se conservan todas las series, incluso incompletas o rechazadas:

- `main-abba`: INVALIDA para tiempos; el wrapper seguía muestreando durante el drenaje GPU.
  Sustituida por `corrected-abba`, `corrected-dense` y `final-abba`, con ventanas exactas.
- `six-biomes`: Desierto incompleto con espera de horizonte en orden incorrecto;
  `desert-low` corrige la residencia. `six-biomes-rest` terminó interrumpido por HMR;
  `desert-medium`, `six-biomes-high` y `frozen-matrix` completan la validación.
- `live-changes`/`commands`: primeros comandos rechazados por requisitos reales de
  emplazamiento/centro. `real-commands` y `world-commands` revelan el bug del Set.
  `fixed-commands` y `shadows-after-commands` validan la corrección.
- `very-low-policy*`: política provisional con culling desactivado en muy baja,
  descartada por alcance del producto; no sustenta el candidato final.

El ahorro de geometría, GPU en normal y payload justifica proponer este cambio
acotado para revisión. El coste CPU y los bloques densos adversos permanecen
explícitos. No justifica recuperar el motor experimental, LOD nativo ni culling
diferencial. Siguiente paso de mayor valor fuera de esta tarea: reproducir en una
GPU débil y otro proveedor antes de afirmar mejoras generalizadas de cadencia.
No continuar microbenchmarks en este mismo equipo ni introducir excepciones de
calidad basadas en él. La PR debe superar las comprobaciones antes del merge autorizado por el usuario.
