# Revision visual de las vistas secundarias

Revision sobre 9992249a6. Se han abierto e inspeccionado las 24 comparativas main-pair-{day,night}-{1,2}.jpg: elevada e inversa, seis biomas, dia y noche. Complementa las 12 vistas normales ya revisadas. No se han generado imagenes nuevas ni cambiado los materiales.

| Bioma | Resultado de las vistas adicionales | Limite o seguimiento |
|---|---|---|
| Sabana | La cubierta conserva volumen en la vista inversa; desde arriba la diferencia principal es separacion de sombras y detalle de suelo. Conserva los claros del asentamiento. | La elevacion reduce naturalmente la lectura de hojas individuales; no aumentar densidad para compensarlo. |
| Gran Rio | Cubierta verde continua visible en inversa, caminos expuestos mas legibles y sombras definidas. De noche los cultivos y construcciones siguen distinguibles. | Estas camaras no muestran una ribera cercana; usar las pruebas especificas de agua, no esta captura como sustituto. |
| Manglares | Los helechos aprobados mantienen masa y silueta incluso en picado. El agua pierde el borde poligonal duro y el suelo desnudo se integra mejor. De noche permanece distinguible la cubierta. | Mantener el arte aprobado. Las capturas estaticas no resuelven transiciones LOD ni el coste de una partida avanzada. |
| Gran Canon | Mayor lectura de estratos y ribera; los cultivos siguen visibles entre pared y agua. La vista inversa confirma continuidad espacial de la franja humeda. | La banda humeda sigue siendo ancha y relativamente uniforme; se registra como limite artistico secundario, sin reabrir el agua calmada aprobada. |
| Desierto | Ondulaciones y sombras conservan el relieve aprobado desde ambas vistas y de noche. El fondo ya contiene montanas y vegetacion. | Algunos arboles lejanos en la inversa diurna parecen poco apoyados en las dunas: comprobar anclaje/oclusion de impostores antes de atribuirlo a posiciones logicas. Es una sospecha visual, no un defecto de altura demostrado. |
| Volcanes | Mejor separacion de ceniza, roca y zonas transitadas; paleta diurna menos azul y lectura nocturna mejor. | La lava original queda aprobada por el usuario; no retomar sus variantes QA. |

## Decision

Conservar la receta nativa seleccionada. La revision de las 36 comparativas estaticas finales queda cubierta entre este documento y README.md; no equivale a revisar todo el movimiento de los videos ni a certificar rendimiento global. La referencia main conserva su limitacion de fondos documentada en README.md.

El siguiente diagnostico visual concreto es el aparente apoyo de los impostores del Desierto en la vista inversa. No se propone desplazar vegetacion ni alterar Wild Engine sin medir antes la relacion entre sus bases, el terreno lejano y la oclusion. El resto de cambios artisticos aprobados permanece intacto.

Compilacion sobre 9992249a6: npm run build correcta (20.30 s), con aviso de bundle mayor de 500 kB. La suite npm test completa se inicio en este mismo estado; sus resultados se registraran por separado al finalizar. No se presenta su ejecucion en curso como aprobada.
