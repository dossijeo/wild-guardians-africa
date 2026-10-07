# Sabana HQ: alternativa sin mipmaps

Mismo atlas de cuatro siluetas, base fog 1, cámara nativa efectiva y seed712.
El flag QA arc-no-mips=1 desactiva generateMipmaps y usa LinearFilter. Dos
giros día/noche completan 73 poses cada uno, sin errores y con estado invariado.
Los informes prueban la configuración del filtro por pose; cuatro capturas
seleccionadas cubren día/noche y yaw0/95. Pestaña705 y WorldScene cerrados.

Las vistas conservan relieve, silueta y contacto general sin un halo cromático
evidente. La referencia histórica con mipmaps está en hq-mountain-four-arcs:
comparte atlas y encuadre efectivo; el harness ha añadido soporte de otros
biomas desde aquella captura. Es comparación visual, no diferencia cuantitativa
de framebuffers ni prueba de identidad pixel a pixel.

No hay una mejora visual suficiente en esas capturas para escoger este filtro
como política definitiva. El muestreo espacial de una imagen no comprueba
parpadeo temporal al moverse ni comportamiento móvil. El negativo CPU que mezcla
celdas desde mip5 sigue vigente; tampoco prueba que esos niveles intervengan en
las cámaras reales. Comprobar niveles efectivos/rangos de inclinación antes de
desactivar mipmaps globalmente o introducir otra representación del atlas.

Sin benchmark GPU, aceptación móvil, medición de driver ni activación en juego.
Recibo con hashes de fuentes, atlas e informes. PNG viewport1280×720.
