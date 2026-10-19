# Checkpoint: edificio único A/B/C

Este experimento permanece detrás de `?visualLab=village-repacked`. No modifica los modelos ni las texturas de producción. El edificio elegido es **Mapungubwe `mapu-0`, «Taller con porche»**. Su cubierta es **terracota/teja roja, no paja**; la siguiente iteración artística debe respetar esa identidad, la franja decorativa, la puerta y los motivos originales.

| Variante | Estado | Resultado visual |
| --- | --- | --- |
| A — atlas runtime original | Referencia | Cubierta, madera y barro originales, con zonas de textura suave. |
| B — UV reempaquetada + color original transferido | Prototipo técnico válido | Misma apariencia observable en WebGL, sin ganar detalle artístico; aumenta espacio UV disponible para una variante nueva. |
| C — redibujo selectivo de materiales | Pendiente del pase artístico | No se ha creado ni medido; no atribuirle resultados. |

## Fuente y fidelidad

No hay GLB de poblado en este checkout. La fuente runtime es `public/content/villages.json` con un binario intercalado de posición, normal y UV, e índices `uint32`. `tools/experiments/repack-single-village-unit.py` reconstruye una copia en Blender headless y guarda los datos de UV. `tools/experiments/rasterize-single-village-atlas.py` transfiere el color al nuevo atlas. Se usa 2048 × 2048 píxeles en A y B. El original permanece intacto.

- 7.992 triángulos y 10.147 vértices en A y B.
- Error máximo de posición y UV original al reconstruir: **0**.
- Ningún vértice con UV reempaquetada divergente entre sus caras.
- Densidad mediana ponderada por superficie: **27,59 → 65,83 texels/m**. Es capacidad para redibujar; por sí sola no recupera detalle ausente de la textura fuente.
- Atlas original: **1.279.936 bytes**; atlas B: **782.534 bytes**; binario local B: **420.608 bytes**. La variante experimental añade una carga extra porque conserva el poblado original para las demás unidades.
- Captura WebGL cercana A/B: **65 draw calls, 669.724 triángulos de escena**, iguales. Una ejecución aislada produjo GPU ~14–15 ms con dispersión; no permite afirmar ganancia de rendimiento.

`reconstruction-audit.json` contiene los conteos exactos. `atlas-transfer.npz` contiene UV de origen/destino e índices para reproducir la transferencia.

## Evidencia visual

Las capturas `case-01-{0,village-repacked}-{medium,close}-{day,night}.webp` se hicieron en el juego WebGL real, semilla/escena QA 1, cámara centrada en el **mismo edificio**, a hora diurna y nocturna. El plano `medium` permite juzgar legibilidad a escala de juego; `close` deja ver la textura. `capture-report.json` conserva los contadores de esa ejecución. La A y B actuales son equivalentes visualmente, por lo que **B no es la mejora final**.

Una primera transferencia quedó cubierta de negro porque el rasterizador invertía V mientras `Assets.texture()` usa `flipY=false`. La corrección usa la orientación runtime y extiende colores fuera de las islas para evitar contaminación negra por mipmapping. Los PNG/WebP de este checkpoint son posteriores a la corrección.

## Límite y siguiente pase

La cubierta terracota y ornamentos conservan las superficies originales. Redibujar a mano las tejas, vetas de madera, barro, piedra y bandas decorativas sobre una copia de atlas a 2048² requiere una fase C independiente, con revisión artística a cámara media y cercana. Puede conservar la UV B si mejora el detalle, pero debe comprobarse de nuevo en WebGL antes de usarla. No activar B por defecto: añade complejidad y carga sin mejora visual suficiente.

Reproducir desde la raíz del repo, con Blender 4.5 y Python provisto de OpenCV/SciPy:

```powershell
blender -b --python tools/experiments/repack-single-village-unit.py
$env:WG_QA_URL='http://127.0.0.1:5189'
$env:WG_NORMAL_CASES='1'
$env:WG_NORMAL_VARIANTS='0,village-repacked'
node tools/experiments/capture-village-normal-lab.mjs
```
