# SFX 121 y 122 — avisos de daño

El SFX 121 `game_building_attacked` suena ante el primer daño real a cada centro durante una incursión. El dominio guarda los IDs atacados en la incursión y captura el hecho con el golpe: cargar la partida no convierte el siguiente daño al mismo centro en otro primer ataque.

El SFX 122 `game_wall_critical` suena al cruzar desde arriba el doble del umbral nativo de colapso de una muralla: actualmente el 40 % de HP, frente al colapso al 20 %. Se deriva del umbral nativo y de los HP de cada pieza, incluidas puertas. Un golpe posterior por debajo del umbral no repite el aviso; una reparación que devuelve HP por encima permite advertir de una nueva transición.

Los hechos capturan HP anterior/posterior, clase de estructura y umbral, de modo que una reparación o desaparición antes del despacho de audio no cambia retrospectivamente la acción. No se añade aviso de daño cuando el escudo evita el daño. Los datos capturados no modifican precios, daño, velocidades ni colas.

Los avisos pertenecen al bus UI, con prioridad de peligro y los límites existentes de voces. Cada lote de eventos agrupa un aviso por tipo; tres murallas cruzando el umbral juntas generan una advertencia y conservan sus contactos originales sujetos a los límites de audio. No hay una consulta nueva por frame al terreno ni reproducción continua al permanecer en estado crítico. Una decodificación tardía (>0,5 s), una salida de escena o una pausa de ocultación invalida el aviso pendiente.

## Evidencia

- [179 pruebas dirigidas](tests.txt), sin fallos, cancelaciones ni omisiones: incluye audio, catálogo, voces, hechos de golpes y su procesamiento repetido, cinco culturas, cinco materiales con murallas/puertas, guardado/carga, escudo, agrupación, pausa/decodificación/salida; también retirada física, colisiones y reproducción del bloqueo de la noche 31.
- [Navegador: 16 casos](browser-report.json): cinco culturas, diez variantes muralla/puerta y un lote de tres facóqueros golpeando tres murallas. Web Audio real con MP3 originales, velocidad de muestra 1, sin bucles ni errores, cero voces restantes y contexto cerrado.
- [Regresión de impactos: 10 casos](material-browser-report.json): se conservan las muestras originales por material/puerta. La página anterior se actualizó para usar el daño vigente de `animalSpec`, evitando su expectativa antigua de 40, y el doble de navegación compartido con los tests.
- [Consola](browser-console.json), [captura](browser.png), [compilación](build.txt) y [hashes de fuentes](source-hashes.json). Build conserva la advertencia de bundle grande.

Las pruebas de audio preparan la fase de ataque y usan terreno plano de prueba; el navegador tiene salida silenciada. Acreditan disparadores, decodificación y creación/liberación de fuentes, **no escucha perceptual, recorrido visual 3D completo ni rendimiento de móvil**. La batería general y campaña larga congeladas en `ee25c8c` no incluyen estos avisos nuevos.

El inventario completo pasa a 81 asignados y 45 pendientes en gameplay. Estas dos integraciones no dan por finalizado el barrido ni la recompresión a Opus solicitada.
