# Coste de sombras de region independiente

A: seleccion visible, sombra10Hz. B: region radial independiente, sombra10Hz. Misma cobertura visible,camara movil8m,mapa4096,Intel UHD1280x720,calidad media,escena poblada pausada. Dos parejas ABAB,60warmup+90muestras por pase;GPU y cadencia separados.

|Fase|GPU A/B ms|Deltas parejas ms|CPU A/B ms|Cadencia A/B ms|
|---|---|---|---|---|
|day|23.20/24.83|+0.88/+2.39|9.13/14.50|30.60/30.54|
|night|23.45/26.35|+1.93/+3.87|9.03/15.36|30.07/33.35|

## Decision

No promover esta implementacion como optimizacion: GPU y CPU empeoran en ambas parejas, con la misma cobertura visible. Preservar la variante artistica y el prototipo para investigar el coste. No reducir densidad como respuesta.

720 queries validas, sin errores GL ni cambios de simulacion. La seleccion visible/camara coincide entre tratamientos. Las repeticiones B tienen diferencias menores de draws; una repeticion nocturna cambia708triangulos en un frame de cadencia (0.00093% del total). No afirmar equivalencia exacta de todos los contadores; detalle en summary.json.

La inspeccion de shadow-cache.js identifica un recorrido de atributos activos de instancias en cada snapshot, incluido el buffer independiente de sombras de18-20mil helechos. Es un candidato de coste CPU, no una atribucion cronometrada. El productor solo actualiza esos buffers cuando reconstruye region: se puede evaluar seguimiento por version para ese productor controlado, sin relajar los controles de los otros sistemas. GPU tambien aumenta; corregir CPU no garantiza mejora global.

Pendientes: invariantes de invalidacion, calidad/streaming/contexto, transicion del limite y sombras donde el color hace fade. No integrar en main.
