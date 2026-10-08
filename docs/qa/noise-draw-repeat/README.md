# Repetición de mundo frente a dibujo, diagnóstico

Sabana/Mapungubwe, seed712/media, ruido volumétrico desactivado (rama analítica
del shader QA). Fixture nativa con mundo detenido y cámara efectiva fija. Cada
ensayo dibuja doce fotogramas mediante WorldScene.render(0), luego doce mediante
clear + cielo + render de escena, conservando origen relativo y bounds del suelo.
La segunda ruta omite actualizaciones de entidades/materiales/luces y preparación
de efectos/profundidad/humo. Es diagnóstico, no sustituto aceptado del render real.

Primer ensayo con configuración inicial de sombras: diferencias consecutivas
RGB del mundo 8,28,26,17,11,9,9,3,0,0,0 píxeles; solo dibujo
0,0,3,6,7,13,18,8,2,0,0. La transición entre rutas coincide exactamente en ese
fotograma; no demuestra equivalencia universal de rutas ni aprobación de shaders.

Segundo ensayo tras botón QA shadowOn: el DOM confirma sombras false y PCF0;
estas banderas no están en el JSON crudo y se describen como observación en el
recibo. Mundo: 29,6,15,18,6,11,8,3,1,9,12 píxeles. Solo dibujo:
0,3,7,8,4,1,6,5,3,11,8. Transición: cuatro píxeles, error máximo 3/255.
Se conservan ambos informes sin corregir ni sustraer controles.

Ambos completan24frames, estado lógico invariado y sin errores capturados.
Las matrices efectivas de cámara constan por fotograma y son iguales en cada
ensayo. Framebuffer1600×900; PNG de viewport1280×720 tras el segundo ensayo.
No GPU timings, no medición de RAM/VRAM, no controles móviles ni de otros biomas.

Conclusión limitada: la variación persiste incluso sin los updates mencionados
y sin sombras en esta vista. No se explica exclusivamente por cámara, sync o
shadowmap. Todavía no identifica qué recursos, shaders, geometría o rasterizado
la causan; tampoco prueba que sea un defecto del modelo o del driver. Falta
localizar píxeles y comprobar dibujo/materiales de control más simples antes
de interpretar diferencias de candidatos. Ruido volumétrico y cambios FrontSide
siguen sin promoverse por estas pruebas.

Hashes de fuentes y artefactos en receipt.json. Sintaxis del módulo y diff check
correctos. La pestaña698 y su WorldScene se cerraron al terminar. Los nuevos
controles permanecen dentro de la fixture QA; no cambian el import graph del juego.
