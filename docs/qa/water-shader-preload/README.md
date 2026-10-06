# Variantes de agua y lava preparadas desde una vista seca

Base 4df8409. Continúa el [diagnóstico de bindings y logs](../first-dust-cpu/README.md).

## Causa comprobada

El observador opcional program-details=1 registra los programas del material antes/después de cada dibujo que enlaza una variante, junto al tipo real de geometría, instancing, sombras y metadatos. En Sabana, el paso 77 dibuja por primera vez un mesh nativeFluid=chunk, no instanciado, con el material compartido de agua sin programas previos. Enlaza dos variantes: destino lineal sin sombras en profundidad y pantalla sRGB con sombras. El frame alcanza 254,6 ms; en el turno anterior alcanzaba 234,5 ms con instrumentación más ligera.

El generador no colocaba agua visible en la región inicial: preparar solo residentes no cubría ese material todavía sin uso. No es un fallo de carga del animal ni un cambio del shader de agua.

## Cambio aplicado

FluidGpuPreload añade durante carga una pequeña geometría plana y, si existen props de agua en el bioma, una instancia con identidad. Ambas toman prestado el material permanente fluidMaterial; mantienen receiveShadow=true, castShadow=false y el instancing correspondiente. La preparación ya existente compila pantalla y la captura real de profundidad, inicializa diagnósticos y realiza el dibujo temporal detrás de la carga.

Al terminar o fallar se eliminan los meshes, geometría y recursos de instancia una sola vez. El material no se clona ni se dispone: conserva las referencias a programas hasta el cierre normal del mundo. No quedan objetos de preparación en la escena. No hay avance de tiempo simulado ni cambios de gameplay, shader, paleta, agua/lava, navegación o daño. Las recetas instanciadas permiten también preparar props aunque todavía no se vean.

## Pruebas nativas

IAB desktop, seed 712, Mapungubwe, calidad media; centro y brote pagados, spawn controlado y recorrido real hasta contacto, pasos de 50 ms. No es incursión natural ni móvil físico. Tiempos CPU inclusivos; la instrumentación añade coste, especialmente program-details, y no mide GPU, FPS ni RAM.

| Ejecución | Pasos | CPU paso 77 | CPU máxima del recorrido | compileShader / linkProgram | Consultas de logs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sabana referencia con diagnóstico ampliado | 523 | 254,6 ms | 254,6 ms | 4 / 2 | 6 |
| Sabana preparada, diagnóstico ampliado | 523 | 25,1 ms | 55,2 ms | 0 / 0 | 0 |
| Sabana preparada, repetición ampliada | 523 | 18,1 ms | 171,1 ms | 0 / 0 | 0 |
| Sabana preparada, observador ligero | 523 | 21,7 ms | 27,3 ms | 0 / 0 | 0 |
| Volcanes preparado, facóquero | 522 | — | 31,6 ms | 0 / 0 | 0 |
| Gran Cañón preparado, grupo hasta daño al centro | 364 | — | 44,7 ms | 0 / 0 | 0 |

Las tres ejecuciones de Sabana conservan exactamente pasos/esperas, contactos/eventos, actores/posiciones/altura/visibilidad, efectos y HP respecto al diagnóstico. Las dos claves completas de programa que causaban el pico están presentes antes del movimiento en la repetición; se registran seis variantes del material y cero primers restantes. El caso de grupo coincide en esos campos con bindings-group de la prueba previa, incluida StructureHit y HP 600→580. Volcanes alcanza AnimalLogicalHit en el cultivo pagado con actor visible; no cuenta con una comparación anterior de ese bioma en esta carpeta. No se acredita que todas las especies del grupo golpearan.

La segunda repetición registra 171,1 ms en el paso 29 sin compilar/enlazar ni consultar logs. La captura de profundidad y el render final suman tiempos inclusivos elevados, pero la traza no determina su causa. Se conserva el contraejemplo: preparar agua elimina las compilaciones observadas, sin demostrar ausencia general de tirones. La medición ligera posterior tampoco demuestra que el observador sea la causa del pico anterior.

## Coste y límites

Sabana referencia: 5.896 ms de carga; preparadas: 6.012,7 / 6.876,7 / 6.053,8 ms. Volcanes 5.813,8 ms y Gran Cañón 5.616,4 ms. Son muestras sin A/B controlado de carga. Sabana pasa de 40 a 45 programas tras carga/aparición: se adelantan variantes que antes eran diferidas, más las usadas por el dibujo temporal. No son bytes/RAM medidos. La geometría temporal sí se libera; no se promete menor coste total ni FPS estable.

Faltan calidades, culturas/biomas restantes, distintos estados de iluminación/VFX, móvil físico, cargas/cierres repetidos con medición de RAM y variantes creadas por futuros residentes. Queda el coste sostenido de dibujo/profundidad y los picos sin compilación. Estas pruebas no completan QA-155 ni la aceptación global del proyecto.

## Verificación y procedencia

78 pruebas dirigidas correctas (4.021,70 ms): propiedad de material/geometría/instancias, captura de profundidad y restauración tras fallo, water/lava sin reloj modificado, diagnóstico opcional, precarga animal/VFX, bindings/errores y recetas nativas. npm run build correcto: 207 módulos, 9,63 s; aviso habitual de bundle >500 kB.

proof.json registra comparaciones exactas, claves de programa preparadas, hashes de archivos/informes gzip y JSON descomprimidos. Los informes se leen completos del DOM; capturas nativas y fuentes finales TXT se conservan. diagnostic usa runtime 4df8409 y el observador ampliado. warm-savanna y warm-lava usan la primera variante del fixture (fixture-before-owner-counter.txt), sin los contadores fluidPrograms/remainingFluidPrimers. repeat-savanna, thin-savanna y warm-canyon-group usan fixture-final, que añade solo observación de propiedad del material y objetos restantes. El runtime no cambia entre esos casos.
