# Manglares, activación de magia y latencia de rutas

Objetivo activo: red de canales y meandros creíble con terrenos secos/embarrados; eliminar bloqueos de escudo y demás magias sin comprometer navegación.

Ampliación solicitada: medir la espera de bestias y trabajadores por rutas y evaluar un endpoint por lotes multihilo. Separar espera de cola, búsqueda nativa, sectores ausentes y publicación. Los resultados deben llevar identidad/destino/revisión para descartar búsquedas obsoletas. No basta con desplazar un bloqueo o permitir atravesar un escudo durante la espera.

Referencia: main d5d48988d, rama de trabajo codex/global-visual-lab. Cambios ajenos preexistentes se conservan.

Inspección inicial (hipótesis, no atribución medida):
- wetlandMask de variante 7 solo conserva dos canales no periódicos; lejos de sus ejes el mundo queda seco. Hace falta una red distribuida, no aumentar únicamente la anchura.
- Escudo: polígono de 64 vértices, refreshPolygon actualiza sectores en todos los perfiles; nav.setState invalida rutas/cachés.
- ShieldVfx crea un efecto en primer uso: investigar coste nativo, shader/driver y rutas separadamente.
- Existe routeActorNativeBatch síncrono; no prueba ejecución paralela. El endpoint threaded de generación no implica que navegación sea thread-safe.

Instrumentación añadida al harness de incursión: WG_MAGIC_PROFILE=1 captura CPU profile, intervalos rAF y long tasks desde antes de seleccionar magia hasta después del escudo mediante UI real. La primera reproducción está en curso; aún no se atribuye causa.

## Primera reproducción medida

Harness final-ten, Chrome/WebGL2, 1280x720, calidad media, clic real en escudo. `shield-before/raid-ui.json`: long task 5364 ms e intervalo rAF máximo 5371 ms. CPU sampling (`magic.cpuprofile`): getProgramInfoLog 4428.745 + 625.934 + 100.236 ms (~5155 ms). Son tiempos síncronos muestreados/espera del driver, NO tiempo GPU. El bloqueo observado está dominado por preparación tardía de programas, no demostrado como navegación. Se debe identificar qué pasada/variante compila y anticiparla/reutilizarla sin ocultar errores ni empeorar carga innecesariamente. Rutas en cola siguen siendo un requisito independiente pendiente de atribución.

## Confirmación por shaders reales

Segunda ejecución: `shield-programs-before`, 37 consultas de programas durante activación, 4911.38 ms síncronos acumulados y máximo intervalo rAF 5054.95 ms. Los shaders más costosos contienen `uniform PointLight pointLights[ 2 ]` e incluyen materiales de animales (`Material_0`, `Mane repairs`, `BakedMaterial`) y del mundo. VfxGpuPreload desactiva sus luces; NativeVfx activa dos PointLight según el efecto. Three incluye el número de luces en la clave de programa incluso para múltiples pasadas. Hipótesis confirmada: cambio global de configuración luminosa al primer escudo dispara variantes de toda la escena.

Siguiente intervención: diseñar luces de VFX con configuración estable durante el mundo, propiedad y liberación explícitas, evitando aumentar variantes con cada efecto simultáneo. Comparar imagen y coste estable; no eliminar luz del escudo como atajo. Mantener las capturas negativas y repetir el mismo harness antes/después. La espera de rutas continúa pendiente y no queda explicada por esta atribución de shaders.
