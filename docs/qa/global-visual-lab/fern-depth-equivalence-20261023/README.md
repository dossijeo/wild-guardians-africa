# Profundidad especializada de helechos cercanos

## Resultado

Candidato QA: reutilizar customDepthMaterial de las frondas cercanas para la captura de profundidad del mundo. No altera color, geometria, densidad ni viento. No se activa para LOD lejano, cuyo antiguo shader de sombras no corresponde a su geometria actual. Sin modificacion nativa; pendiente medir coste antes de promover.

Sobre33bceb918, Intel UHD/ANGLE,1280x720,media,fixture712 pausada,camara normal,LOD nativo:1181 matas cercanas y700 lejanas. Tres posiciones de viento (0,2,5),dia/noche. Cada secuencia compara A/B/A sincronamente: mismo estado, misma camara y uniformes. Se lee la textura de profundidad de smokeDepth mediante packDepthToRGBA a un target RGBA8 y se comparan los bytes. Equivalencia a esta precision de lectura, no afirmacion sobre bits crudos del attachment.

En las seis comparaciones:0 pixeles distintos A/B,0 A/A y0 diferencia maxima de byte. La preparacion confirma47→48 objetos especializados,1041→1040 fallback. Control positivo: ocultar solo las frondas cercanas modifica100401/100680/100422 pixeles segun viento, igual en ambas fases. Esto verifica que la lectura observa su silueta. La ocultacion solo sirve de control y se restaura antes de salir; no forma parte de la variante propuesta.

La lectura transfiere datos a CPU y NO sirve para medir rendimiento. Target, geometria y material auxiliar se liberan, bandera de compatibilidad y reloj QA se restauran. Sin errores de pagina registrados. No certifica aun todas las camaras, perfiles, humo visible ni una mejora de FPS.

Reproducir: node tools/experiments/compare-fern-depth-20261023.mjs con Vite5190. Helper qa-fern-depth-equivalence-20261023.js. audit.json contiene controles y clasificacion por muestra. Siguiente paso: benchmark sin readback que aisle la pasada y luego el fotograma completo con simulacion activa; conservar solo si aporta ahorro real.
