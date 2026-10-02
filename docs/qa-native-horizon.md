# Horizonte y área residente de Bioma Lab V4

Se recuperan las dos recetas originales de terreno lejano. Cañones: radio
384, celdas 4×8 y río por franjas de una unidad. Desierto: radio 576, celdas
8×8, normales suaves y faldón bajo la unión fina/gruesa. Ambas recetas usan
abanicos con vértices de una unidad en el borde interior para coincidir con
la malla residente. Los buffers Float32 conservan posiciones, normales y
colores originales; el grupo se traslada al centro del chunk.

El cañón recorta terreno y río fuera del rectángulo residente semiabierto.
El desierto conserva el faldón sin ese recorte, como el lab. El terreno lejano
no proyecta ni recibe sombras, no entra en navegación/colocación y no modifica
estado de plantas o edificios. Se libera al cambiar de centro, calidad o
cerrar; frames estáticos conservan las mallas.

El área próxima se centra en el ojo de cámara, como ChunkManager.plan, con
radio 2 (5×5) y radio 3 en alta (7×7). Son las dos capacidades del lab. Cambiar
la calidad afecta a la representación, no al tamaño de la finca. Las otras
cuatro familias de bioma no tienen una receta de horizonte en el original;
se mantienen sus chunks residentes. No se inventa otro terreno lejano.
El plano lejano de cámara usa 500, como el modo terreno del lab.

Se retira la niebla 130–250 de la integración: el lab conserva los colores
materiales a distancia. Los edificios DEST, sus escombros/humo y los VFX
restablecen explícitamente el rango desactivado cuando la escena no tiene
niebla, incluyendo el caso de retirarla después de haberla tenido.

Pruebas dirigidas: ocho horizontes (dos biomas, dos semillas y dos centros/
radios) comparan cada byte con las funciones extraídas independientemente del
HTML. Los cuatro lados interiores comprueban todos sus vértices enteros contra
lattice. También se comprueban centro de streaming, fronteras negativas,
25/49 chunks, recorte de shader, separación de programas, cero regeneración
en frames estáticos, limpieza de recursos y retirada de niebla. Pasan 39
pruebas dirigidas en 6,477 s. CI anterior 21fb862 aprobada en 37023662809.

Regresión final: 530/530 pruebas, sin omisiones, en 254,798 s. Build aprobado
en 5,98 s y paquete web verificado: 547 archivos, 379.349.839 bytes, 791
enlaces relativos y 20 GLB de ejecución, sin duplicar originales.

CUA: cañón con 25 chunks en media y 49 en alta, río y paredes lejanas,
desplazamiento de un chunk y noche; desierto con 25 chunks, dunas a baja
altura, desplazamiento nocturno y material Basic en muy baja. Todos los
casos registrados tienen cero errores y niebla desactivada. Capturas y
estados en `test-results/native-horizon-*`. No se ocultaron props. Un primer
desplazamiento del cañón después de forzar la cámara al suelo quedó tapado
por un prop; se conserva ese estado y se repitió el recorrido con el
encuadre nativo. La ocultación automática de obstáculos sigue pendiente.

Siguen pendientes origen flotante del renderer, generación por worker,
batching global, LOD por distancia/materiales completos de props,
ocultamiento automático, calidad muy baja de fluidos, rendimiento móvil y
otros requisitos del Plan Maestro. Esta revisión no prueba la fidelidad
completa del renderer ni todos los recorridos táctiles.
