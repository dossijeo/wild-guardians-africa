# Contraprueba nativa de ruido: cámara efectiva fija

Seguimiento de [la prueba con controles variables](../noise-spatial-native/README.md).
Misma fixture Sabana/Mapungubwe, seed 712, calidad media, veinte vistas × tres
fases y A/A/B/B/A. Se resuelve primero la protección de terreno/orbita; después
se omite solo `world.updateCamera` durante los cinco fotogramas de cada grupo.
Se restaura en `finally`. No se modifica la cámara del juego ni se desactivan
sombras, iluminación, animaciones, sincronización de entidades o materiales.

Sesenta grupos terminados, estado lógico restaurado, errores vacíos. Matriz
world de cámara, eye y target constan por fotograma; las matrices son exactamente
iguales dentro de los sesenta grupos. La cámara efectiva fija no elimina toda
variación: A1/A2 cambia en 59 grupos (hasta 49 píxeles RGB), B1/B2 en 56 (395),
A2/A3 en 59 (868). MAE máximo de ventana 16×16: 0,01251/0,03323/0,03323;
el máximo error RGB es 151/255. No aprobar por el pequeño MAE global ni atribuir
estas diferencias automáticamente al ruido, al driver o a caras coplanares.
Todavía falta localizar su causa.

A2/B1 cambia hasta 99730 píxeles. La comparación sigue ocurriendo dentro del
mismo shader envuelto QA: no acredita equivalencia de su fallback con el shader
de producción sin envolver. Framebuffer del informe: 1600×900. Sin timings,
sin medición de memoria GPU, sin aceptación de otros biomas o móvil.

Inspección visual adicional: parejas de cultivos/estados y murallas de día,
cuatro trabajadores/cinco bestias de noche y volumen en terreno X=-160/Z=-64.
En estas capturas no se aprecia un cambio grueso de paleta ni un patrón nuevo
evidente. No son todas las sesenta vistas ni pruebas de animación/gameplay;
la fixture usa escala nativa 1 para personajes. PNG de viewport 1280×720 y
lecturas numéricas tienen resoluciones diferentes. Capturas posteriores al
runner: el estado de luz/cámara elegido no está amparado por su restauración.

`receipt.json` conserva hashes de fuentes, informe y capturas. La escena y pestaña
697 se cerraron después de exportar. Sintaxis del módulo válida. El volumen de
ruido permanece fuera del import graph del juego. Próxima prueba: separar cambios
de presentación/recursos de la repetición de dibujo y localizar píxeles variables,
manteniendo los negativos anteriores y sin convertirlos en una aprobación.
