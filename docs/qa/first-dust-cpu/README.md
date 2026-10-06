# Diagnósticos y bindings de shader preparados durante carga

Base de render: 82d2d52; b3b0602 solo añade documentación del guardián. Continúa la [precarga VFX](../vfx-shader-preload/README.md).

## Hallazgo y cambio

Three.js 0.180.0, fijado en package.json, resuelve compileAsync antes de ejecutar onFirstUse del programa. getUniforms/getAttributes ejecutan las comprobaciones de errores y crean las tablas de reflexión al utilizar por primera vez una variante. En el paso 48 del facóquero de Gran Cañón no había compileShader/linkProgram nuevos, pero getProgramInfoLog y getShaderInfoLog sumaban 118,8 ms dentro de ese frame de 145,3 ms.

initializeProgramBindings llama a ambos getters para los programas residentes ya compilados, detrás de la pantalla de carga y antes del dibujo real de preparación. Conserva las comprobaciones de errores: una excepción se propaga y el mundo no se declara preparado. No desactiva checkShaderErrors ni cambia shaders, paleta, VFX, geometría, navegación, daño o ticks del juego. Deduplica referencias al mismo programa. Las APIs se comprueban antes de invocarlas; si una futura versión expone solo metadatos, conserva el dibujo de preparación y registra unsupported.

Se adelanta el coste de crear las tablas que Three crearía durante el primer dibujo. No se acredita ahorro de RAM ni menor tiempo total de carga. Los programas que se compilen después, por nuevos residentes o variantes, quedan fuera de esta preparación inicial.

## Evidencia nativa

IAB desktop, Mapungubwe, seed 712, calidad media. Centro/brote pagados y spawn controlado con navegación y contactos originales, pasos de 50 ms. No es noche natural ni móvil físico. El observador CPU solo se activa con cpu-passes=1 y frame-profile=1; restaura métodos al finalizar, incluso tras fallo. Sus filas son inclusivas y se solapan: no deben sumarse como tiempo exclusivo ni tiempo GPU.

| Caso | Pasos | CPU máxima world.render | compileShader / linkProgram | Consultas de logs durante movimiento |
| --- | ---: | ---: | ---: | ---: |
| Gran Cañón, facóquero, base con observer v1 | 399 | 115,1 ms | 0 / 0 | No instrumentadas |
| Gran Cañón, facóquero, base con observer v2 | 399 | 145,3 ms | 0 / 0 | 15 |
| Gran Cañón, facóquero, bindings preparados | 399 | 24,1 ms | 0 / 0 | 0 |
| Sabana, hiena, bindings preparados | 523 | 234,5 ms | 4 / 2 | 6 |
| Gran Cañón, grupo original hasta daño al centro | 364 | 39,0 ms | 0 / 0 | 0 |

El paso 48 de Gran Cañón baja a 21,6 ms; corresponde a la primera activación de polvo de locomoción, anterior al ataque al cultivo. Se inicializan 27 programas en ese caso, 25 en Sabana y 26 en el grupo. Los campos de eventos/contactos, actores/posiciones/altura, efectos, HP, pasos/esperas y visibilidad coinciden exactamente con sus respectivas referencias: reflection, savanna-hyena y opening-group. El grupo conserva StructureHit y HP 600→580; no acredita que las cinco especies hayan atacado.

Sabana sigue compilando dos programas Standard paintUniforms en el paso 77, uno en captura de profundidad (colorWrite=false) y otro en color. getProgramInfoLog suma 201,2 ms allí. paintUniforms corresponde al material de agua; esta traza no identifica todavía qué cambio dispara ambas variantes. No presentar la mejora de Gran Cañón como solución global del tirón.

Tiempos de carga de las ejecuciones finales: 4.996 ms Gran Cañón cultivo, 5.385,8 ms Sabana y 4.931,4 ms grupo. Son muestras individuales, sin A/B controlado de carga ni prueba de CPU/GPU/RAM en teléfono. La instrumentación añade coste. Tampoco se garantiza un máximo de frametime fuera de estos recorridos.

## Verificación y procedencia

74 pruebas dirigidas correctas (3.899,07 ms): bindings/diagnósticos, fallos, deduplicación, propiedad/restauración de hooks, precarga de animales y VFX, profundidad/restauraciones, locomoción y recetas nativas. npm run build correcto: 206 módulos, 9,25 s; aviso habitual de bundle >500 kB.

Los JSON gzip contienen informes completos leídos del DOM, con capturas correspondientes para las variantes finales. proof.json conserva hashes de archivos y JSON descomprimidos, fuentes finales copiadas literalmente, comparación de campos lógicos y hashes del código instalado de Three. cpu-observer-v1.txt y fixture-v1.txt corresponden al primer caso; cpu-observer-v2.txt y el mismo fixture-v1 corresponden a reflection. El fixture final añade únicamente observación de bindings a esa versión. La fuente base del runtime es el commit indicado; scene-final.txt conserva el cambio probado. El primer observador no medía logs: su ausencia no prueba cero consultas.

Pendientes: localizar y preparar las dos variantes de agua de Sabana, comprobar nuevos chunks/calidades/luz, otras culturas/biomas, carga y memoria, móvil físico, incursión natural y aceptación amplia. Las dos campañas congeladas independientes se verificaron vivas por proceso; no se utilizan como prueba del HEAD actual.
