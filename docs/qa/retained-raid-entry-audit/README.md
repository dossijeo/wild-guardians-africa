# Entrada de incursiones y utilidad de murallas

No se repite una campaña ni se cambia producción. Se reconstruye geometría estática y se ejecuta una prueba acotada de selección/movimiento/primer impacto.

## Mundo conservado del piloto

`entry-reconstruction.json` utiliza el estado terminal original de la campaña4d939cb8, con428 muros. Su topología de estructuras coincide con la preparación de entrada de la noche6. Las tres salidas reconstruidas coinciden exactamente con las salidas registradas.

Facóquero e hiena se reconstruyen dentro de la caja global de muros, a3,10 y4,39m de la cámara. El león queda fuera. Esto apoya la hipótesis de entradas interiores, pero no acredita que el perímetro real estuviese cerrado: una caja no es un recinto y las coordenadas originales de nacimiento no se guardaron en el informe.

## Recinto cerrado controlado

`closed-enclosure-probe.json` conserva un caso independiente: terreno plano sin props,80 piezas contiguas, recinto40×40m sin puerta, cultivo interior. Usa colisión real de Navigation y movimiento/ataque nativo; HP de muros100 sintético. No es un ensayo visual ni una campaña en Gran Cañón.

- Cámara dentro (z8): el animal aparece dentro (z11,1), elige el cultivo y completa CropHit tras9,55s de movimiento/animación.
- Cámara fuera (z30): aparece fuera (z33,1), elige una muralla y completa StructureHit tras4,4s.
- En ambos casos la colisión de murallas impide cruzar directamente del exterior al interior.

**Hallazgo:** el algoritmo actual puede introducir animales directamente en un recinto cerrado cuando la cámara está dentro. La intercepción cambia sin variar los muros. No debe suponerse protección90% en el balance hasta resolver esa entrada y comprobar rutas/daños reales.

Los tiempos son pasos del actor aislado, no tiempos de carga, FPS o duración de una incursión completa. No se han recalculado presupuestos ni iniciado nuevas campañas100. Los artefactos incluyen hashes de fuentes, inputs retenidos y perfil del bioma.

## Candidata exterior aislada (10 de octubre)

`exterior-candidate.json` compara cuatro orientaciones cardinales con la misma
topología, centro y cultivo. La producción introduce al facóquero dentro en las
cuatro y el primer impacto es CropHit. La candidata desplaza la entrada fuera de
la envolvente de los muros y obtiene StructureHit en las cuatro. El grupo completo
de cinco especies también aparece fuera, sin solapamientos y con salida legal.

El cálculo aislado de entrada costó aproximadamente1,3–3,7ms para un animal y
6,7ms para el grupo completo en esta ejecución. Son muestras CPU únicas con
cachés/JIT diferentes, no benchmark AB/BA ni evidencia de mejora de rendimiento.
El campo spawnMs de la candidata excluye la selección ya preparada: no debe
compararse directamente con spawnMs de producción como ahorro total.

La candidata sólo vive en `tools/probe-exterior-raid-entry.mjs`; no la importa el
juego. Se conserva la entrada existente si todo el grupo ya queda fuera. En caso
contrario proyecta una cámara auxiliar más allá de la envolvente de muros y utiliza
el selector nativo. Si falla, prueba el borde activo y rechaza resultados interiores.
La vista original se restaura incluso en errores; no cambia el estado ni el RNG.

**Limitaciones y siguiente gate:** la envolvente no detecta cierre ni puertas y
puede alejar entradas innecesariamente en muros abiertos, parcelas separadas o
recintos cóncavos. Tampoco garantiza que una muralla que cruza el borde activo
deje una entrada exterior disponible. Falta comprobar esos casos, cierres contra
edificios/paredes naturales, los seis biomas y geometría renderizada antes de
decidir una integración. No demuestra protección90%, supervivencia100 noches,
framerate o aceptación física. Las distancias al ojo real quedan registradas,
porque esta opción flexibiliza el requisito de nacer justo detrás de la cámara
cuando ésta está dentro de un recinto defendido.

Reproducir: `node tools/probe-exterior-raid-entry.mjs docs/qa/retained-raid-entry-audit`.
Comprobaciones: `node --test tests/exterior-raid-entry-experiment.test.js`.

## Refinamiento por conectividad y casos negativos

`topology-candidates.json` registra21 casos: producción, envolvente y candidata
con testigo de conectividad, para siete topologías. Los impactos se producen con
el actor nativo; no se reconstruye una campaña ni se altera producción.

| Topología | Producción | Envolvente | Testigo de conectividad |
|:---|:---|:---|:---|
| Cuadrado cerrado | CropHit dentro | StructureHit fuera | StructureHit fuera |
| Cuadrado abierto, hueco10m | CropHit,3,1m del ojo | CropHit,20,1m del ojo | CropHit,misma entrada3,1m |
| Puerta adobe | CropHit dentro | StructureHit fuera | StructureHit fuera |
| Dos recintos separados, cámara entre ambos | CropHit,3,1m | CropHit,20,1m | CropHit,misma entrada3,1m |
| Recinto cóncavo en L | CropHit dentro | StructureHit fuera | StructureHit fuera |
| Sin muros | CropHit | Misma entrada | Misma entrada |
| Muros fuera del borde activo | CropHit dentro | Sin entrada aceptada | Sin entrada aceptada |

El testigo usa hasta16 segmentos nativos desde nacimiento y salida hasta el
exterior de la envolvente, con el radio del animal y `worker=false`. Basta un
paso libre para conservar la entrada actual. No hay A* ni floodfill adicional;
un resultado negativo no prueba encierro porque puede existir una ruta curva.
La puerta es transitable para trabajadores según reglas distintas, pero para
animales conserva colisión de muralla: no debe interpretarse como hueco abierto.

**Resultado:** la envolvente simple produce un alejamiento innecesario en casos
abiertos; no promoverla sola. El testigo evita esa regresión en los casos
probados, pero no resuelve rutas exteriores curvas ni cobertura natural de los
seis biomas. La candidata tampoco garantiza incursión si no queda exterior
dentro de los límites activos. Es un gate bloqueante de integración: se necesita
una estrategia de extensión/preparación del área exterior, validando navegación
y residencia visual, o un selector topológico que encuentre un exterior legal.
No aceptar un nacimiento interior para hacer pasar el ensayo ni suprimir la
incursión garantizada como solución.

Ambas candidatas permanecen exclusivamente en herramientas QA. No se cambia
la cámara del jugador, el RNG, dinero, precios, balance o formato de guardado.
El actor se actualiza hasta su primer impacto o un límite diagnóstico120s; esos
pasos no son duración completa de incursión. Las muestras CPU no permiten
concluir una mejora de FPS o coste general de inicialización.

Reproducir: `node tools/probe-raid-entry-topology.mjs docs/qa/retained-raid-entry-audit`.
Comprobaciones: `node --test tests/raid-entry-topology-experiment.test.js`.
