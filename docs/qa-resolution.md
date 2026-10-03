# Resolución independiente: diagnóstico DPR 1

3 de octubre de 2026. `nativeRenderResolution` admite un límite opcional de DPR
del mundo (`WorldScene.pixelRatioLimit`). El valor por defecto conserva la receta
del lab. El botón **DPR 1 / perfil** del fixture African Toon alterna ese límite
sin cambiar calidad, materiales, sombras, LOD ni estado lógico. No modifica
`devicePixelRatio` del navegador ni la resolución de los canvas del HUD.
Es una herramienta de diagnóstico; el selector persistente del juego queda
pendiente de evaluar y diseñar.

Publicado en 69e4053. [Suite completa](qa/resolution/tests.txt): 645/645.
Pruebas dirigidas: 6/6. La nueva prueba verifica 36 % menos de píxeles en la
medición original, límites independientes de los cuatro perfiles, DPR de
dispositivo menor que el límite, rechazo de límites inválidos, restauración y
retención de geometría/materiales/chunks/estado/sombras. Las pruebas anteriores
siguen contrastando el tamaño por defecto con la receta nativa, móvil y 4K.

Comparación real en Sabana/Mapungubwe/712, misma cámara, tiempo simulado fijo,
calidad media y shader completo, caché de sombras activa. Intel UHD/ANGLE;
viewport CSS 1280×720, DPR del navegador 1.25. Orden A–B–B–A con 30 frames
de calentamiento y 180 consultas GPU válidas por ensayo:

| Muestra | Resolución 3D | GPU media (ms) | CPU media (ms) |
| --- | --- | --- | --- |
| [A1](qa/resolution/profile1.json) | 1600×900 | 54.25 | 15.36 |
| [B1](qa/resolution/dpr1-1.json) | 1280×720 | 45.22 | 14.84 |
| [B2](qa/resolution/dpr1-2.json) | 1280×720 | 39.24 | 15.62 |
| [A2](qa/resolution/profile2.json) | 1600×900 | 42.80 | 16.60 |

Todas conservan 111 calls y 1,560,185 triángulos por fotograma, mapa de sombras
1024×1024, cámara y objetivo idénticos, estado lógico sin cambios, pestaña
visible y cero errores. A1 regenera una sombra durante el calentamiento y tiene
209 hits; las otras tienen cero regeneraciones y 210 hits. El promedio combinado
es 48.52 frente a 42.23 ms GPU, pero la variación entre repeticiones es importante
y la suite Node se ejecutó simultáneamente. No se promete una mejora de FPS del
36 %, ni se extrapola a partida dinámica, móvil u otros dispositivos.

[Perfil original](qa/resolution/profile.png) y [DPR 1](qa/resolution/dpr1.png)
preservan composición y sombreado, con diferencias de nitidez y detalle al
rasterizar menos píxeles. No se exige identidad de imagen para esta prueba.
En ambas condiciones el rectángulo CSS del canvas sigue siendo 1280×720.
El HUD nativo no está presente en este fixture; la conservación de su resolución
se apoya en no modificar su código ni el DPR global, no en una comparación
visual del HUD durante esta sesión.

Comprobación adicional del pipeline con DPR 1: ocho cultivos con etapas/morph,
defensas y puertas, centro dañado con 44 escombros, cuatro trabajadores y cinco
bestias; restauración a 1600×900. Estado de los dos casos y consola guardados en
el directorio de evidencia. No sustituye aceptación completa de VFX o matriz de
30 combinaciones. Build y paquete aprobados: 554 archivos, 379,668,764 bytes,
794 enlaces relativos, 20 GLB runtime sin duplicados originales.

La [consola](qa/resolution/console.json) conserva un warning del compilador ANGLE
sobre una variable potencialmente no inicializada (`f_environment4`); no hubo
errores WebGL o excepciones en los informes. La receta GLSL tiene retornos en
todas sus rutas, pero queda pendiente investigar el shader traducido antes de
atribuir ese aviso a una causa o descartarlo como falso positivo.
