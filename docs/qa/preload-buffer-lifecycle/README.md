La precarga libera buffers temporales, pero estas mediciones todavía no acreditan el consumo total de memoria ni la ausencia de fugas. Runtime probado: `39d753d`; sólo se añaden diagnóstico y pruebas, sin cambiar el juego.

Se ejecutaron dos recorridos nativos en el navegador de escritorio: Gran Cañón/facóquero y Sabana/hiena, Mapungubwe, semilla 712, calidad media. Centro y brote pagados normalmente; contratación inicial vacía y spawn controlado. Alcanzan el primer golpe al cultivo en 399 y 523 pasos, respectivamente, con actores visibles dentro del frustum, sin esperas de disponibilidad, errores, descargas GLB adicionales (7→7) ni nuevos programas de material animal. No acreditan trabajadores activos, una noche natural completa, audio/HUD o móvil.

La opción QA `resource-profile=1` instala el observador antes de `world.load`. Cuenta los bytes solicitados mediante `bufferData`, resta sustituciones y llamadas `deleteBuffer`, y registra el máximo del saldo observado. Consulta el binding real en cada solicitud: también respeta el buffer de índices asociado al VAO actual. No observa subidas como nuevas asignaciones (`bufferSubData`). No hubo solicitudes sin atribuir en estas dos muestras.

| Saldo de bytes solicitados, sin `deleteBuffer` observado | Gran Cañón | Sabana |
|---|---:|---:|
| Tras preparación GPU | 36.635.672 | 49.233.452 |
| Tras carga y primer render | 41.983.824 | 59.165.432 |
| Tras primer contacto | 40.338.532 | 61.708.242 |
| Máximo durante recorrido | 44.571.528 | 62.847.188 |
| Justo antes de solicitar pérdida de contexto | 9.121.602 | 10.930.990 |
| Tras `world.dispose` | 2.562.812 | 4.175.300 |

En la fase de preparación GPU se observan 98.852 bytes liberados en ambos casos. Esa fase también sube recursos permanentes de la escena: su saldo **no es el coste incremental exclusivo** de precargar animales o VFX. Tras la carga se registran 80/160 geometrías, 55/50 texturas y 57/54 programas; son contadores, no bytes.

La opción `dispose-world=1`, junto con el perfil de recursos, ejecuta el cierre real al terminar el contacto, espera el evento `webglcontextlost`, confirma `isContextLost()` y evita seguir renderizando. Las dos muestras confirman el contexto perdido. El saldo del observador no se pone artificialmente a cero: la liberación implícita por pérdida de contexto no pasa por `deleteBuffer`. No significa que esos 2,56/4,18 MB sigan residentes en la GPU tras la pérdida. Tampoco demuestra que todas las referencias JavaScript estén liberadas.

Hay una comprobación pendiente concreta: revisar la propiedad y limpieza de prototipos, texturas y cachés fuera de la escena. El cierre actual llama a `assets.disposeModels` después de perder el contexto; antes de esa llamada todavía se cuentan 24/31 geometrías, 25 texturas y 10 programas. Tras ella quedan 20/27 geometrías y los mismos contadores de texturas/programas. Estos datos justifican revisar el orden y los propietarios, sin afirmar todavía una fuga real. Verificar después ciclos repetidos y cargas interrumpidas.

El observador excluye texturas, memoria de programas/driver, heap JavaScript y asignaciones previas a su instalación; no consulta errores GL. Los bytes describen solicitudes API, no asignaciones físicas verificadas. Las consultas de binding añaden coste de diagnóstico: los tiempos de estas muestras no se usan para comparar carga, frametime o FPS.

Reproducción: abrir `/tests/browser/animal-preload.html?biome=gran-canon&motion=1&attack-species=warthog&resource-profile=1&dispose-world=1`, o cambiar a `biome=sabana&attack-species=hyena`. Los JSON completos están comprimidos con gzip; las capturas muestran el informe después del cierre, con el canvas ya cerrado. `proof.json` registra SHA-256 de archivos y JSON descomprimidos; se guardan las fuentes de la sonda y fixture usados.

Validación: 31 pruebas dirigidas de buffers, contadores GL/CPU, animales, VFX, agua, bindings y profundidad, todas correctas (867,7638 ms). Incluyen offsets/longitudes WebGL2, sustituciones, eliminación repetida, binding por VAO, excepciones y restauración de wrappers. No se repite build porque no hay cambios de runtime; el CI Validate de `39d753d` ya terminó correctamente, Windows seguía en curso al revisar.
