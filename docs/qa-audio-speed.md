# Audio y aceleración automática: QA-154

Base de juego `92bf994`; fixture y evidencia `db9b07c`. Caso verificado.
No se añadió un control manual de velocidad: el plan exige día ×1, noche
tranquila ×5 e incursión ×1 hasta la salida física del último animal.

## Comparación en navegador

[Fixture reproducible](../tests/browser/audio-speed.html), ejecutada en el
navegador integrado sobre el origen QA local 5180. Usa Navigation original de
Sabana, poblado Mapungubwe, semilla 712 y un centro adquirido mediante
placeStructure. No escribe guardados. Se preparan expresamente las horas
100/310 y un nightPlan ya resuelto para aislar una noche tranquila; no se mide
la probabilidad natural de ataques. Los dos escenarios de incursión se generan
con spawnRaid nativo y un facóquero real.

Los seis ensayos usan Game.advanceReal con el delta real de requestAnimationFrame
y el límite de 0,1 s del frame de producción. AudioSystem carga y decodifica los
MP3 originales, reproduce diez stems por pack mediante MusicTransport y el mismo
SFX farm_watering_can. La salida está silenciada mediante los buses reales de
volumen. No hay dobles de AudioContext ni se sustituye su reloj.

| Pack | Escenario | Segundos enviados a advanceReal | Segundos simulados | Segundos WebAudio |
| --- | --- | ---: | ---: | ---: |
| A | Día | 6,0165 | 6,0165 | 6,0080 |
| A | Noche tranquila | 6,0061 | 30,0305 | 6,0000 |
| A | Incursión nocturna | 5,4995 | 5,4995 | 6,0000 |
| B | Día | 6,0129 | 6,0129 | 6,0107 |
| B | Noche tranquila | 6,0025 | 30,0125 | 6,0080 |
| B | Incursión nocturna | 5,4982 | 5,4982 | 6,0187 |

En las incursiones hubo frames que superaron 0,1 s; el límite descarta el exceso
para la simulación, mientras WebAudio sigue su reloj real. Por eso se compara la
velocidad lógica contra el delta efectivamente enviado, sin ocultar esa diferencia.
No es una medición de FPS ni rendimiento GPU.

Todas las fuentes observadas mantienen playbackRate=1 y detune=0. El SFX
decodificado dura cuatro segundos y su onended llega tras cuatro segundos de
AudioContext en los seis escenarios. Se conservan diez fuentes musicales;
los marcadores de compás siguen el reloj del transport: 2,181818 s en A (110 BPM)
y 2,222222 s en B (108 BPM), independientemente de ×1/×5. La variación máxima
de la observación por frame respecto al intervalo programado es 0,014223 s.
El reloj de audio difiere del real como máximo 0,142 % en las muestras.

[Datos completos](qa/audio-speed/report.json),
[comprobación independiente de datos](qa/audio-speed/comparison.json),
[consola sin errores/avisos](qa/audio-speed/console.json) y
[captura final](qa/audio-speed/comparison.png).
stop libera todas las fuentes registradas al terminar.

## Regresión y alcance

`node --test tests/acceptance-clock.test.js tests/audio-routing.test.js tests/music-transport.test.js tests/music-evolution.test.js`:
38/38 pruebas aprobadas, cero fallos u omisiones, 4.614,3112 ms.
Incluye cruce fraccionario de anochecer, llegada de incursión, salida física del
último animal, pausas, transporte, pitch, límites y limpieza de fuentes.

La comprobación acredita el reloj, los parámetros de pitch y la duración real
de reproducción. Es una prueba técnica silenciada, no una evaluación auditiva
de la calidad de mezcla. No representa treinta combinaciones de bioma/cultura,
una campaña larga ni el conjunto de QA-155/156. No cambia shaders, música,
economía ni comportamiento del juego.
