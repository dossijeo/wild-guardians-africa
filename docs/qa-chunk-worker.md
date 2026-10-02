# Generación asíncrona de chunks

El terreno, el agua y la población visual ejecutan las recetas deterministas
del Bioma Lab V4.0 en un worker de módulo. Se transfieren los dos buffers
Float32 sin copiarlos al crear las geometrías de Three. La navegación conserva
su generación lógica independiente; la supresión de props se consulta al
instalar cada respuesta con el estado vigente de la partida.

La cola despacha una petición cada vez, prioriza cercanía y dirección de cámara
y utiliza identificadores y épocas para rechazar respuestas obsoletas tras
viajar, reconstruir o cerrar la escena. La carga inicial sigue el umbral nativo
de nueve chunks; el anillo exterior continúa cargando durante el juego. Un fallo
del worker conserva el trabajo pendiente y pasa a generación local, con una
tarea por turno de eventos. Los fallos de generación o instalación se comunican
y rechazan la espera, sin reintentos infinitos. Cerrar cancela las esperas y
termina el worker.

El navegador detectó una llamada inválida a `setTimeout` en el modo local:
guardar la función y ejecutarla como método cambiaba su receptor. Los wrappers
actuales llaman a las API globales correctamente. La fixture también fuerza
la actualización tras colocar su centro, para comparar ambos modos con las
mismas supresiones, incluso cuando parte del terreno llegó antes de colocarlo.

## Evidencia

- Worker real de Node: doce chunks en seis biomas, matrices de población,
  terreno y agua idénticos a las recetas locales. Ambos buffers quedan
  separados del worker al transferirse.
- Pruebas de cola: orden, una petición activa, identificadores ajenos, viaje,
  reconstrucción, error, fallback, cierre, datos incorrectos, supresión vigente
  y disponibilidad inicial de nueve chunks sin esperar todo el anillo.
- Regresión anterior al ajuste final de disponibilidad: 577/577, sin omisiones,
  en 279,402 s (`tests-chunk-stream-complete.txt`). Las modificaciones finales
  pasan 21/21 pruebas dirigidas en 5,908 s. No se atribuye el recuento completo
  anterior a la versión final; GitHub Actions ejecutará esa versión.
- CUA: Sabana worker/local, viaje y alta/media, más Gran Río, Manglares,
  Volcanes nocturno, Cañones y Desierto. Cultura Mapungubwe, semilla 712;
  registros y capturas `test-results/chunk-worker-*`. No acredita la matriz
  completa de treinta combinaciones ni rendimiento en teléfonos.
- Sabana, cámara y reloj fijos: el recorte inferior de 1280×320 compara
  409.600 píxeles entre worker y local; cero diferencias, máximo por canal cero.
  El HUD queda fuera de la comparación. Alta conserva los 25 chunks de media y
  añade 24; volver a media conserva 25/49 y libera solo las 24 geometrías
  exteriores, sin cambiar el estado de la simulación.
- Paquete compilado servido en `/nested/itch/game/`, sin fallback en raíz:
  menú, selector y partida con HUD y tutorial cargan, sin avisos ni errores
  de consola. El registro inicial conserva el texto de carga al 36 %; se
  corrigió su limpieza al terminar el arranque. La repetición final acredita
  `stats` vacío y consola sin avisos ni errores (`chunk-worker-built-final.json`
  y su captura). Build final 5,46 s; paquete de 548 archivos, 379.417.656 bytes,
  791 enlaces relativos y 20 GLB de runtime, sin duplicados originales.

El worker no desplaza todavía el cálculo síncrono de los horizontes de
Cañones/Desierto ni la navegación. La instalación de geometrías y las subidas
a GPU ocurren en el hilo principal. Esta revisión no demuestra una tasa de
fotogramas objetivo, ni completa el origen flotante, los filtros nativos de
sombras o las pruebas integrales del Plan Maestro.
