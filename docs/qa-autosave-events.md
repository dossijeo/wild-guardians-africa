# Autoguardado por eventos nuevos

Corrección `75e8470`, continuación de QA-144 y
[aislamiento de ranuras](qa-save-isolation.md).

La selección anterior del frame excluía únicamente el ID del último evento
previo, en vez de descartar todos los eventos previos. Así podía seleccionar
un amanecer más antiguo en un frame quieto. El [reproductor previo](qa/autosave-events/regression-before.txt)
evalúa la expresión extraída de `main.js` sobre dos historiales pequeños y
registra eventos de amanecer seleccionados aunque no haya una nueva frontera.
Además, `frame.lastSaveEvent` se compartía al cambiar de partida, mientras que
los IDs de evento reinician su secuencia en cada ranura.

Ahora cada frame captura su propio último ID antes del avance y guarda sólo
si después aparecen Dawn, RaidEnded, CampaignWon o GameOver nuevos. Cuando el
historial acotado de 200 eventos descarta ese ID, sus entradas restantes son
posteriores y se puede guardar la última frontera retenida. No existe un
marcador de otra ranura ni un temporizador periódico de guardado. Varias
fronteras en el mismo frame producen un único snapshot del estado final.

GameOver cubre el amanecer que termina en derrota, sin emitir un Dawn de
contratación. CampaignWon conserva la noche 100 antes de optar por postgame.
Las compras estructurales y salida a menú mantienen sus llamadas explícitas.
Reintentar una partida terminada comprueba ahora éxito antes de descartar el
estado actual, igual que volver al menú.

## Validación

[75 pruebas dirigidas](qa/autosave-events/directed.txt), cero fallos/omisiones,
2.960,8455 ms. Incluyen selección incremental, guardado, aislamiento, contratos,
juego y eventos agrícolas:

- Un frame quieto o un nuevo WaterSatisfied no vuelve a seleccionar amaneceres
  antiguos. IDs iguales en dos partidas y rollover de 200 eventos siguen funcionando.
- El amanecer real de Game.tick aplica Buena temporada y reconstruye las colas
  antes de guardar. Cinco avances posteriores durante contratación no escriben
  otra vez y la segunda ranura conserva exactamente sus bytes.
- Una incursión real termina por su ruta de salida, con presupuesto preparado
  explícitamente en cero; el snapshot tiene raid null, un solo RaidEnded y la
  necesidad inicial reconstruida. No acredita combate o daño natural en ese caso.
- Una derrota económica al amanecer y la victoria de la noche 100 se guardan
  con su resultado final. Otro avance no genera escrituras.
- Comprar un muro y volver al menú conservan pago, estructura, identidad del
  comando, pausa y snapshot de la ranura actual; la otra ranura queda intacta.

Fixtures financiados, terreno/rutas doblados, almacenamiento en memoria con
SaveRepository de producción. No son nuevas pruebas de navegador ni de cuotas.
La integración en main utiliza directamente el selector probado, pero falta
la inspección de los cuatro disparadores y sus errores en la UI de QA-144;
el caso permanece parcial.

[Build/paquete web](qa/autosave-events/build.txt) aprobados: 554 archivos,
379.690.445 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales.
El CI de esta corrección se verificará separadamente al terminar.
