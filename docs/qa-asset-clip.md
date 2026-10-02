# Recorte de formaciones por chunk

Bioma Lab V4.0, `script-8.js`: `ChunkManager` marca `clip` en el slot 19
excepto Cañones y Desierto; `drawMainV4` utiliza los límites del chunk de 48
unidades. La pasada principal FS incluye los mínimos X/Z y excluye los
máximos. La pasada sólida DVS/DFS de sombras no contiene ese recorte.

La integración conserva literalmente el predicado, cambiando solo nombres
para componerlo con Three y African Toon. Las tres geometrías LOD llevan
límites por instancia; sus materiales de atlas siguen compartidos. La
posición de descarte incluye matriz de instancia y matriz del objeto.
Cambiar de LOD no cambia los límites. El recorte también participa en la
captura de profundidad DEST, que dibuja esos mismos materiales.
Los grupos globales siguen excluyendo esos lotes; Cañones y Desierto
mantienen la agrupación completa. Agua conserva su recorte independiente.

Los atributos GPU de las vistas de geometría son propios, con arrays de
vértices prestados. Descargar un chunk o cerrar la escena libera las vistas
sin destruir la geometría original ni la de las sombras sólidas. No cambian
la población lógica, navegación, contactos, probabilidades ni economía.

Tres pruebas nuevas comparan el predicado con la fuente, ejercitan los dos
modos y los límites exactos, las seis excepciones de bioma y los veinte slots,
dos chunks adyacentes, cambio de LOD, exclusión de grupos y composición del
shader con cobertura y cel. La regresión dirigida pasa 13/13 en 0,344 s.
La regresión integrada pasa 563/563, sin omisiones, en 257,174 s. Build pasa
en 6,10 s; el paquete web valida 547 archivos / 379381487 bytes, 791 enlaces
relativos y 20 GLB de runtime, sin duplicados originales.
La página QA recibió posteriormente controles de fixtures y cambios de
terminadores de línea; no modifican el bundle productivo probado.

La QA del navegador utiliza la semilla 712, Mapungubwe y calidades mixtas.
En Sabana la primera vista nativa de una charca limítrofe no produce una
diferencia visible entre activar y desactivar el recorte: no acredita por sí
sola su efecto. La fixture explícita mueve una formación existente hasta el
borde máximo X de su propio chunk y oculta el agua de assets de ese chunk.
Con cámara y tiempo fijos, el par `clip-savanna-fixture-on/off.png` muestra
la mitad exterior retirada; 92793 píxeles difieren en la región de escena
1280×471, con delta máximo 217. Los contadores de geometría y sombras se
conservan: solo cambia el descarte principal.

Gran Río y Volcanes nocturno se comprueban con formaciones nativas. Manglares
no tiene una formación limítrofe en la región inicial elegida; el diagnóstico
inserta explícitamente un refugio del slot 19 sobre el borde para verificar
su shader en calidad baja. Esa fixture no pertenece a una partida real ni
se persiste. Cañones y Desierto se comprueban como excepciones sin recorte.
Registros y capturas en `test-results/clip-*`. No constituyen la matriz visual
completa de todas las culturas/calidades ni acreditan FPS en móvil.
Las vistas terminadas conservan cero errores y avisos de consola/WebGL.

Siguen pendientes origen flotante, generación mediante worker y gestión
completa de recursos. Esta revisión no da por terminado el Plan Maestro.
