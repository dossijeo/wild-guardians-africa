# Audio y colapsos en mundo nativo

Runtime base `18ada6c`; fixture `tests/browser/audio-world-collapses.html` ampliada
para usar el callback `onDestructionCue` de main, contar emisiones/contactos y
exigir fuentes reales de SFX 043/046. La versión anterior de esta fixture no
conectaba esa ruta y no podía acreditar su integración.

Navegador integrado, localhost5191, Sabana/Mapungubwe, seed712, calidad baja.
Crédito QA10000;32 brotes,8 trabajadores y3 centros pagados. Incursión dirigida
de5 especies durante el día; dos centros reciben daño directo como carga QA y
el principal recibe el golpe animal tras preparar78% de daño. **Salida silenciada
y SFX precargados**; no es escucha perceptual ni medida de primer decode/FPS.

`workers.json`:1301 pasos observados de0,1s,50 riegos reales, fuentes de pasos,
esfuerzo, siembra y agua; transporte MusicWindowTransport a48kHz. No se retienen
buffers musicales completos según las guardas ejecutadas. Pico del pool PCM de
ventanas37438464 bytes, que no equivale al uso total de RAM.

`final.json`:1629 pasos, incursión terminada,3 centros ruinados,2 colapsando a
la vez.70 lotes de cues con290 fragmentos emitidos y290 contactos con el suelo;
7 fuentes043 y12 fuentes046 aceptadas. Pico19 SFX,16 fuentes musicales,2 por
emisor y4 por familia, dentro de los límites comprobados. Las fuentes musicales
incluyen solapamiento de ventanas; no se afirma que16 pistas fueran audibles.
Picos nativos:101 partículas de humo,95 fragmentos por centro y620 instancias de
fragmentos renderizadas entre centros. Al terminar,0 voces y contexto closed.
Errores vacíos y chequeos WebGL correctos durante todos los pasos observados;
los observadores de audio conservan el dominio serializado en cada paso.

Se observaron cuatro plantas maduras y sus cuatro solicitudes automáticas de
cosecha, pero **no entrega física de cosechas** antes de cerrar la prueba. También
se aceptaron cuatro ui_click, ya que HarvestRequested conserva una asignación
heredada de la antigua cosecha manual; revisar esa asignación para el gatillo
automático. Esta prueba tampoco acepta ataques individuales de cada especie,
audio perceptual, móvil, carga en frío o balance de una noche natural.

`final.png` conserva el estado visible de la prueba, pero el canvas está vacío
en esa captura final. No acredita la imagen de los modelos/colapsos. La fixture
renderiza entre pasos y no mantiene un render continuo al quedar detenida;
falta comprobar la causa y capturar el mundo antes de aceptar su aspecto visual.
`provenance.json` identifica runtime/fixture; `hashes.json` identifica capturas e informes. El gate de133
scripts de134 páginas pasó tras el cambio. No se alteró la fixture ajena
`tests/browser/audio-world-phases.html`.
