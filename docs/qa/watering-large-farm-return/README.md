# Rutas de regreso en una finca grande

Continuación nativa del guardado histórico Sabana/Musgum de e461b550 sobre
main `cbfbf50a`. Victoria archivada, continuar postgame ordinario y contratación
pagada de 112 trabajadoras mayores; no cambia terreno, posiciones, crecimiento,
colisiones, FIFO ni economía. Dos ejecuciones de cien ticks dt=0,1 s con
Navigation fría. Cada una compara todo el estado serializado del original y
del observador después de cada tick. Ambas terminan exit 0 y conservan el mismo
hash de trayectoria `fb569074713db27fbbd434fed6f3b5ca2ee482a226cbc9ee7769b989ce9a801c`.

Primero se ejecutó el observador existente; después se añadió atribución por
metadata del destino a `tools/check_watering_route_diagnostics.mjs`. No hace
consultas adicionales de terreno, colisión o alcance. Registra tres categorías
y hasta 32 primeras consultas fallidas no encontradas en caché. Módulos exactos
y runners antes/después comprimidos con hashes; el cambio de ruta de importación
de módulos temporales explica distintos hashes del observed-game, sin cambios
de Game original. Las dos ejecuciones tienen idénticos contadores previos,
trayectoria, estado final y observaciones de riego.

Resultado: 122 rutas de riego encontradas, seis puntos descartados por
walkable, cero rechazos de altura o ruta de riego. Hay 3337 consultas de
navegación y 152 búsquedas, 3100 consultas fallidas, de ellas 3073 con fallo
exacto ya memorizado y solo 27 claves de fallo. **Todas esas consultas fallidas
tienen destino home-village-1**: no son intentos de regar. Termina día 101,
tiempo 10 s, 143 trabajadores, 1342 cultivos vivos, 1084 tareas y ninguna
marcada como bloqueada. Workers incluye contratos anteriores; no confundir
143 con los 112 contratados para esta jornada.

Un sondeo posterior separado reconstruye Navigation fría desde el guardado y
revisa los puntos registrados, sin ejecutar ticks. El destino (60,0) es
transitable. Los 27 orígenes muestreados no pasan terrainValid ni walkable y
no solapan props ni edificios según las pruebas registradas. Esto distingue
un problema de origen de un destino ocupado en este caso, pero no identifica
cómo llegaron históricamente ahí ni prueba una ruta de recuperación válida.
No instrumenta ni modifica las campañas vivas de Gran Cañón/Gran Río.

Los PIDs 20024/49032/41320/41304 seguían activos; no son tiempos de benchmark,
FPS ni aceptación de cien noches actuales. Las sesiones 89412 y 72256 son
terminales exit 0. El checkpoint no reproduce aún el atasco de Gran Cañón;
los fallos nulos tampoco acreditan inaccesibilidad global.

Verificar archivo: `node docs/qa/watering-large-farm-return/verify.mjs`.
Reproducir: `node tools/check_watering_route_diagnostics.mjs docs/qa/intensive-sabana-musgum-e461b550/state.json.gz .cache/watering-replay/report.json 100`.

Siguiente trabajo: aislar qué rechazo de terreno afecta a esos orígenes y
revisar recuperación física tras desplazamientos/knockback, preservando las
restricciones y evitando teletransporte. Capturar también el atasco real de
Gran Cañón cuando exista un checkpoint representativo. No sustituir esos
problemas por una relajación global de colisiones o de alcance de riego.
