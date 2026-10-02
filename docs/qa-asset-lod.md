# LOD nativo por distancia

Se reemplaza la selección fija por calidad por los tres niveles originales de
cada prop. `tools/prepare_asset_lod.py` extrae literalmente la selección de
`updateAssetLods` del Bioma Lab V4.0; el hash identifica la fuente normalizada
con LF. Instancias en coordenadas globales equivalen al desplazamiento de
chunk del lab. Tamaño y centro vertical se calculan siempre con la malla plena.

Los límites del lab se conservan: formación 50/105/10000, hierba 10/25/64,
arbustos 16/38/95, grupo 4 17/42/110, árboles 38/85/10000, grupo 5
35/75/10000 y otros 24/55/160. Radio descontado: un cuarto del mayor tamaño XZ
escalado. Alta equivale a high (1,25), media a normal (1), baja y muy baja a eco
(0,8). Es una correspondencia explícita entre los cuatro ajustes del juego y
los tres del lab, no una simplificación nueva de las mallas.

Cada chunk conserva hasta tres InstancedMesh por asset, compartiendo las
mallas, atributos y material originales. Solo se reagrupan las matrices cuando
cambia la selección, con la clave de cámara cuantizada a 1,5 del lab. Las
esferas de frustum se invalidan al reagrupar. Un fotograma estático no sube
matrices. No se altera el estado lógico de las instancias, la supresión,
navegación, contacto AO ni el agua de los assets. Los obstáculos de las manos
usan las cajas plenas y sus identificadores originales, aunque un prop lejano
no se dibuje. La cobertura tiene un propietario lógico por instancia y se
copia al índice del bin de dibujo; cambiar de LOD no reinicia su fundido ni
triplica sus contadores. Streaming elimina las vistas privadas y sus matrices.

## Verificación

La prueba ejecuta el método completo del lab como referencia, con seis grupos,
dos roles, cuatro calidades y tres posiciones tridimensionales de cámara;
compara las listas ordenadas de instancias. Comprueba también transformaciones,
fundidos, ausencia de subidas estáticas, descarte y reaparición y recursos.
Las pruebas dirigidas de LOD/ocultación/horizonte/contacto pasan 16/16 en
3,819 s. La regresión integrada pasa 553/553, sin omisiones, en 251,479 s.
Los contadores de triángulos y el hash del generador añadidos después de iniciar
esa regresión están cubiertos por la ejecución dirigida final. Build final
4,20 s y paquete web aprobados: 547 archivos, 379372342 bytes, 791 enlaces
relativos y 20 GLB de runtime, sin duplicados originales.

La QA del navegador muestra los niveles, descartes, cambios y triángulos.
Sabana alta, cámara inicial: 29/360/1987 instancias, 6895 descartadas,
3388526 triángulos frente a 47551987 si todas usaran la malla plena. El
fotograma estático de media registra cero cambios. Acercamiento y viaje
regeneran las selecciones sin error WebGL. Capturas y estados en
`test-results/lod-*`. Se revisan los seis biomas, con las cuatro calidades
repartidas entre las escenas y noche en Manglar; diez estados guardados sin
avisos de consola ni errores WebGL. No es una matriz visual de las treinta
combinaciones ni de todos los niveles de calidad por bioma.

## Límites pendientes

Los conteos son geometría seleccionada de props residentes; no equivalen a
triángulos efectivamente rasterizados después del frustum, ni incluyen terreno,
poblados, agua, personajes o pasadas de sombras. No acreditan FPS en móvil.
La agrupación global entre chunks, el origen flotante y la selección especial
del último LOD para la pasada de sombras del renderer original siguen
pendientes: Three actualmente proyecta la geometría seleccionada para color.
No se da por completada la optimización web ni el Plan Maestro.
