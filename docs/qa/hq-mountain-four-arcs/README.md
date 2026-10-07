# Montañas HQ: cuatro siluetas de Sabana

Revisión nativa de la rama `codex/far-hq-mountains` c74dfa8f, Sabana/Mapungubwe,
seed 712, calidad media. Cuatro fuentes imagegen distintas, sin reflejos,
con proporción 4:1 conservada; atlas 2048×512 de 787504 bytes, un sampler y
un mesh de 96 triángulos. Bruma de base 1, desplazamiento vertical 0.

Se inspeccionaron y conservaron vistas diurnas/nocturnas en azimut 0, 95, 185
y 275 y dos valles diurnos en 45/140. Dirección visual aceptable: relieve natural,
mesas y colinas de alturas distintas, espacios abiertos, sin simetría por espejo
ni halo evidente en estas capturas. La mezcla de bruma mantiene el contacto con
el horizonte. No equivale a aceptar todas las posiciones de cámara ni biomas.

Dos giros nativos de 73 poses cada uno, día y noche, finalizan con estado lógico
invariado, GL error 0 y errores capturados vacíos. Los JSON comprimidos y sus
hashes conservan los datos por pose. Se inspeccionaron los fotogramas enumerados,
no se afirma haber revisado visualmente los 146. Cámara efectiva, iluminación,
dimensiones de textura y draw calls constan en los informes. Las capturas PNG
son de viewport 1280×720; no atribuirles una resolución de framebuffer distinta
sin dato explícito. El contador de texturas no mide bytes ni RAM del driver.

Pendientes: filtrado entre celdas (auditoría offline detecta contaminación desde
mip5), comparación nativa sin mipmaps, movimiento/inclinación, transición de luz,
coste GPU integrado y móvil, adaptación/aceptación de los demás biomas. Una
captura sin halo evidente no elimina el negativo de mip5+. No promover todavía
el atlas ni sustituir fondos públicos. Se acepta la dirección de composición
para continuar el trabajo de fuentes, conservando estos límites.

`receipt.json` vincula fuentes de rama y bytes de evidencia. Las fuentes originales,
prompts y contrato de exportación reproducible permanecen en la rama; estas
capturas e informes en main no forman parte del paquete web. WorldScene y pestaña
696 se cerraron al acabar la revisión.
