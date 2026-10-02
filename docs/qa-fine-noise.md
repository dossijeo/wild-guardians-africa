# Diagnóstico del ruido fino

El control `Ruido fino sí / no (QA)` del fixture African Toon cambia únicamente
un uniforme compartido por suelo, objetos, cultivos, personajes, DEST y escombros.
El juego conserva el ruido activado por defecto. El diorama del menú usa su
renderer independiente. El GLSL recibido y sus funciones extraídas siguen intactos.

La rama desactivada sustituye las dos muestras de pigmento por su media (.32)
y la muestra fina del suelo por .5; mantiene el ruido de escala amplia, bandas,
paleta, contornos, HDR y sombras. Desaparecen también las variaciones de normal
que dependían del ruido fino. Las imágenes **no son idénticas**: el suelo pierde
detalle, como muestran [activado](qa/fine-noise/on.png) y
[desactivado](qa/fine-noise/off.png). No se ha cambiado ningún perfil de calidad.

## Medición

Sabana / Mapungubwe, semilla 712, calidad media, misma cámara y estado detenido,
1600 × 900 internos, viewport 1280 × 720, DPR 1.25, Intel UHD mediante ANGLE.
Orden A–B–B–A en la misma pestaña, 30 frames de calentamiento y 180 consultas
GPU válidas por muestra. A tiene ruido; B usa la rama neutra.

| Muestra | GPU media / p95 (ms) | CPU media (ms) |
| --- | --- | --- |
| [A1](qa/fine-noise/a1.json) | 43.71 / 47.47 | 16.05 |
| [B1](qa/fine-noise/b1.json) | 40.33 / 53.90 | 16.85 |
| [B2](qa/fine-noise/b2.json) | 37.89 / 43.65 | 15.80 |
| [A2](qa/fine-noise/a2.json) | 45.08 / 55.16 | 16.59 |

Las cuatro muestras mantienen 111 calls y 1,560,185 triángulos por frame;
simulación sin cambios, pestaña visible durante la medición y cero errores.
La caché de sombras conserva 210 hits por muestra salvo A1, cuyo calentamiento
incluye una actualización y 209 hits. El cambio de ruido no invalida sombras.
La media combinada GPU baja de 44.40 a 39.11 ms (~11.9 %) en esta escena.
El p95 de B1 ilustra la variabilidad: no se promete una mejora de FPS ni ese
porcentaje para otros dispositivos, biomas, cámaras o incursiones.

La suite Node corrió simultáneamente: existe carga CPU externa y las medidas
de envío/cadencia no aíslan el coste CPU del shader. Las consultas GPU abarcan
las mismas pasadas, sin `finish` ni fences. Es una prueba de sensibilidad al
ruido, no una comparación del antiguo shader sin la rama de diagnóstico.

## Comprobaciones adicionales

Compilación real sin ruido en suelo Standard y Basic (muy baja), cultivos,
defensas, [DEST con agujeros y escombros](qa/fine-noise/damaged.png) y
[props volcánicos con emisión](qa/fine-noise/volcanic.png). Los estados Basic y
volcánico y la consola se conservan en la carpeta de evidencias. Esto no acredita
la matriz completa de 30 combinaciones ni rendimiento móvil.

Los tests verifican que la rama activada recupera exactamente las operaciones
autorizadas, falla ante cambios de receta desconocidos, comparte el uniforme sin
recompilar ni cambiar la calidad y lo conecta a edificios/escombros de las cinco
culturas. El siguiente paso es comparar una receta de ruido más barata o una
textura, con imágenes y medición; la eliminación definitiva no está decidida.

Validación del cambio d5ab255: [suite completa](qa/fine-noise/tests.txt)
632/632; [tests focalizados](qa/fine-noise/targeted.txt) 21/21;
[build y paquete web](qa/fine-noise/build.txt) aprobados (554 archivos,
379,665,874 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales).
