# Incursiones con varios visitantes

La cámara individual acercaba la vista a 18 unidades del primer visitante.
Con un grupo, eso dejaba fuera del encuadre a la mayoría de animales. Se corrige
el viaje inicial para abarcar el grupo activo, conservando orientación y
protección del terreno. Se reserva margen para HUD y tutorial; la distancia
no se reduce durante el viaje para evitar oscilaciones. Al llegar a la finca
se deja de perseguir al grupo, y el control manual cancela el viaje como antes.
Los visitantes individuales conservan su acercamiento anterior.

## Juego real A/B

Sabana, semilla 712, 1280×720, calidad media, misma partida guardada por caso.
Se verifican idénticas posiciones de nacimiento y salida, especies y radios.
El fixture selecciona el grupo de la siguiente incursión; no altera dinero,
invulnerabilidad, posiciones, navegación ni animaciones. Los grupos grandes
son pruebas controladas, no la composición normal de la primera noche.

| Grupo | Centros dentro del frustum antes | Después, ocho muestras | Escudo mediante UI |
|---|---:|---:|---|
| 4 especies | 2–4 de 4 | 4 de 4 | Correcto |
| 10, dos de cada especie | 6–7 de 10 | 10 de 10 | Correcto |
| 16 facóqueros | 3 de 16 | 16 de 16 | Correcto |

Los 16 representan el límite de actores por oleada del plan de presión actual.
`comparison.json` contiene las muestras. Los recuentos usan raíz +1 m:
**estar dentro del frustum no significa que no haya oclusión por vegetación,
otro animal o el HUD**. Las capturas se revisaron también visualmente. No se
presentan estas observaciones como benchmarks de FPS.

| Caso | Vídeo anterior | Vídeo corregido | Captura corregida |
|---|---|---|---|
| 4 | [Antes](mixed-four/raid-ui.webm) | [Después](mixed-four-framed/raid-ui.webm) | [Ver](mixed-four-framed/group-0.png) |
| 10 | [Antes](mixed-ten/raid-ui.webm) | [Después](mixed-ten-framed/raid-ui.webm) | [Ver](mixed-ten-framed/group-0.png) |
| 16 | [Antes](warthog-sixteen/raid-ui.webm) | [Después](warthog-sixteen-framed/raid-ui.webm) | [Ver](warthog-sixteen-framed/group-0.png) |

También pasa el [grupo de cuatro en Gran Cañón](mixed-four-canyon/raid-ui.webm),
con movimiento y activación real del escudo en la ribera. Los visitantes
pueden esperar su turno mientras otros atacan: no se fuerza a todos a atacar
simultáneamente ni se cambia el comportamiento autoritativo para el vídeo.

## Recursos y regresiones

`resources/report.json`: diez modelos reservados (dos de cada especie) en
WorldScene/Gran Cañón, carga de reserva y movimiento hasta el primer impacto.
Cada copia tiene modelo, esqueleto y textura de huesos propios; comparte
geometría y materiales. No hay descargas adicionales de bestias ni nuevos
programas de material animal al aparecer. Esta escena diagnóstica complementa
las partidas reales anteriores; no sustituye la cámara del juego para medir
su encuadre.

Pasan 63 pruebas de cámara; después se añade y pasa la regresión de control
manual con un grupo (cinco pruebas en `group-framing-tests.txt`). Build y
paquete pasan: 973 archivos, 465.404.432 bytes y 17 GLB runtime.

No se garantiza abarcar cualquier dispersión del mundo ni todos los cuerpos
durante todos los ataques: prevalecen los límites de seguridad de la cámara.
En pantallas estrechas el HUD sigue siendo una limitación conocida. La
corrección del tutorial vertical está apuntada por separado.

## Reproducción

Definir `WG_BEAST_FIXTURE_ID` y `WG_BEAST_GROUP` (lista de especies separadas por
comas), ejecutar `tools/experiments/create-beast-raid-fixture.mjs <especie>
<bioma>`. Con Vite activo, definir `WG_QA_URL`, `WG_BEAST_QA_OUT` y
`WG_BEAST_GROUP_OBSERVE=1`; ejecutar
`tools/experiments/check-beast-raid-ui.mjs <especie>`. Los fixtures guardados
están en `../fixtures/`. Para comprobar propiedad y reserva de recursos,
ejecutar `tools/experiments/check-beast-group-resources.mjs`.
