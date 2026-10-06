# Maniobras locales ante cuerpos lejanos

El checkpoint natural de Sabana/Mapungubwe, noche 39, está conservado en `../paid-defense-failure-ee25c8c/failure-state.json.gz`. Su reproducción íntegra sobre **8754b27** tarda 708,05 s reales en avanzar 120 s simulados y sigue sin resolver la incursión: el animal 95772 permanece en (104, 3,9728), y el 95773 oscila a cientos de metros de la finca. El informe comprimido incluye procedencia y rutas.

## Corrección

Una curva ocupada lejos del animal no debe saltarse como si fuera un encuentro local. Se conserva la ruta hasta acercarse a su zona; ceder el paso también exige proximidad física. Esto mantiene los encuentros cercanos y evita que un trabajador remoto provoque sucesivas maniobras hacia fuera de la finca.

Un tramo largo heredado de esas maniobras puede cruzar un prop. Para ese caso concreto se comprueba el tramo local y se repara mediante la búsqueda nativa incremental existente. No se altera salida, spawn, radios, velocidades, economía, daño ni geometría. La búsqueda sólo se activa ante el tramo obstruido; no se incorpora un A* síncrono nuevo.

## Evidencia y límites

- Regresión sintética que falla con la implementación anterior: tras diez pasos de 0,1 s, el animal retrocede a x=-3,72; con la corrección avanza a x=3,8 y conserva sus puntos de ruta.
- Regresión del checkpoint con cuerpos estacionarios para aislar la navegación: 125 pasos de 0,1 s. Avanza más de 40 m hacia su salida original; cada segmento respeta la velocidad máxima, el terreno nativo y los cuerpos. Se conservan trabajadores y ledger. Antes de reparar el tramo heredado, el paso 92 atravesaba un prop; el diagnóstico ampliado reparado conserva todos los segmentos válidos.
- 25 pruebas de movimiento/retirada y 174 pruebas ampliadas correctas; build de 207 módulos, 9,18 s. Persiste el aviso de bundle superior a 500 kB.

La reproducción íntegra de los mismos 120 segundos simulados sobre **509fcdc** termina en 5,84 s reales. El animal 95773 vuelve desde (227,33, -344,08) hasta la finca, terminando en (105,97, -1,96); el animal 95772 sigue en su posición inicial. La incursión sigue **sin resolver**. El informe `current-replay.json.gz` conserva las rutas y procedencia. La reducción del tiempo de ejecución pertenece a esta reproducción CPU de navegación, no acredita FPS, coste GPU ni rendimiento móvil.

**Pendiente:** los bloqueos junto a los trabajadores caídos cuando ambos animales alcanzan la finca, completar realmente esta incursión y una campaña nueva de 100 noches. Estas pruebas aisladas no acreditan que la incursión completa termine ni el rendimiento del juego completo. No se presenta la campaña histórica de otra procedencia como resultado de esta versión.
