# Agrupación global de props por recurso

Se integran las reglas de `mergedGroups` del Bioma Lab V4.0: agrupar geometría
y material de props entre chunks, separar las pasadas de color y sombra,
conservar excepciones de recorte y retirar los grupos que ya no tienen datos.
La capacidad usa la siguiente potencia de dos, mínimo ocho, como en el lab.
El shader y sus texturas permanecen compartidos por asset y LOD.

Los chunks conservan sus instancias lógicas, selección de LOD, matrices,
cobertura, contactos y obstáculos. Sus meshes elegibles pasan a una capa
reservada que la cámara del juego no dibuja. La vista global copia matrices y
cobertura a buffers propios. Las identidades de atributos GPU son propias,
aunque las matrices estáticas de vértices usan los mismos arrays CPU: retirar
un grupo no destruye buffers prestados a otra pasada. Firmas de membresía,
versiones de matrices/cobertura y transformaciones evitan subidas estáticas.
La cobertura no invalida la pasada de sombras. Cambiar la capacidad recrea los
recursos privados; retirar o cerrar los libera. Las matrices usan DynamicDraw.

La visibilidad principal utiliza el AABB del terreno y todos los props con
sus dimensiones plenas, nunca las del LOD reducido. Los planos del frustum
coinciden con `ChunkManager.cull` del lab para la misma matriz de cámara.
Las sombras conservan los chunks fuera de cámara y usan el último LOD,
con geometría sólida y sin hierba. El slot 19 queda fuera de la agrupación en
los biomas donde el lab marca recorte por chunk; en Cañones y Desierto puede
agruparse. Agua, suelo, poblados, centros, trabajadores, bestias y cultivos
mantienen sus propios contratos de render. La excepción de agrupación conserva
el comportamiento anterior del slot 19; no implementa su recorte pendiente.

## Verificación

Regresión integrada: 560/560, sin omisiones, en 245,456 s. Pruebas dirigidas de
grupos/LOD/sombras/ocultación/horizonte/contacto: 23/23. El ajuste final de
DynamicDraw y su aserción se verifican en la ejecución dirigida posterior a la
regresión. Los casos comprueban frustum contra el método original, cajas plenas,
matrices, cobertura independiente, sombras de chunks fuera de cámara, caché,
excepciones, capas, capacidad y liberación sin destruir recursos prestados.

Comparación GPU Sabana/Mapungubwe/712 alta, cámara fija, tiempo simulado
congelado: agrupar y dibujar individualmente produce los mismos 620800 píxeles
en la región de escena de 1280×485, delta máximo cero. Se inicializan las
pasadas antes de guardar el par. Los 49 chunks residentes tienen 16 chunks
visibles; la pasada principal agrupa en 49 recursos. Sombras de props:
149 llamadas individuales frente a 16 agrupadas. La pasada agrupada envía
1342909 triángulos frente a 698109: el grupo incluye toda la población y el
recorte de la luz ocurre en GPU; la vista individual aplica también frustum
por mesh. Esa diferencia no cambia los píxeles de esta comparación. Un
fotograma estático muestra cero subidas de grupos. Se comprueban acercamiento
con ocultación y viaje con descarga/carga, sin error WebGL. La comparación
precede al ajuste DynamicDraw; el ajuste no cambia datos ni geometría.
Artefactos en `test-results/groups-*`.

La comprobación dirigida final pasa 23/23 en 5,107 s; build pasa en 5,16 s.
El paquete web valida 547 archivos / 379379371 bytes, 791 enlaces relativos
y 20 GLB de runtime, sin duplicados originales. El registro de navegador
conserva trece vistas de los seis biomas con Mapungubwe y calidades mixtas,
incluidos daño DEST, agua, noche volcánica, relieve de Cañones y Desierto,
actores aislados y Desierto nocturno en calidad muy baja. No registra avisos
ni errores. La vista de actores retira todos los grupos y sombras de props;
la calidad muy baja conserva cero llamadas de sombras. No constituye la
matriz completa de biomas, culturas y calidades.

## Límites pendientes

Los grupos y bytes mostrados describen capacidades de arrays de instancias
elegibles, no memoria residente total de GPU ni todas las llamadas del juego.
Las sombras desactivadas pueden conservar arrays CPU sin subirlos a GPU.
El control individual
es diagnóstico. La copia de matrices de Three conserva 16 floats por instancia
frente al formato compacto del renderer WebGL del lab; el estado lógico local
sigue conservando sus matrices CPU. Cambiar capacidad puede volver a subir
vértices privados. No se acredita rendimiento móvil ni la matriz visual de
culturas/calidades completa. Origen flotante, generación mediante worker,
recorte especial del slot 19 y gestión completa de recursos siguen pendientes.
Esta revisión no da por completado el Plan Maestro.

El recorte especial se completa posteriormente en
[QA del recorte de formaciones](qa-asset-clip.md).
