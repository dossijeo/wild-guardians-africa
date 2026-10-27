# Revisión elevada de los seis biomas

Se inspeccionaron los seis montajes adjuntos, con doce parejas día/noche de la
vista 1. Se verificaron las huellas SHA-256 de las 24 fuentes contra
main-current-gallery.json antes de componerlos. Cada fuente 1280×720 se reduce
proporcionalmente a 640×360; no se retocan color, iluminación ni contenido.
provenance.json identifica las fuentes y condiciones emparejadas archivadas.

Izquierda: main histórico b2497b0695218652672c805c40971ea830686e3a.
Derecha: capturas archivadas del laboratorio, no nuevos renders de HEAD.
Las correcciones posteriores del encuentro con suelo lejano y del handoff del
Cañón tienen sus propias validaciones; estos montajes no las prueban.

| Bioma | Observación directa | Decisión / límite |
|---|---|---|
| Sabana | Se conserva la paleta seca cálida y el poblado legible. Las sombras diurnas separan mejor los edificios. La cubierta se percibe más como textura desde arriba que desde la cámara oblicua. | Conservar. No aumentar densidad para forzar volumen desde una vista cenital; la continuidad depende también de las pruebas oblicuas y en movimiento. |
| Gran Río | Los caminos terrosos se diferencian de la cubierta verde con mayor claridad. Construcciones y cultivos siguen visibles; por la noche disminuye el contraste sin desaparecer la organización del suelo. | Conservar. Aquí no se ve la ribera, por lo que esta pareja no cierra la validación del agua. |
| Manglares | El musgo sustituye la apariencia de pequeños bultos repetidos de la referencia; las frondas forman una masa reconocible. Los claros de barro y el agua azul se integran mejor. De noche aún se distinguen las hojas. | Conservar la dirección aprobada. Esta vista fija no demuestra ausencia de patrones al mover la cámara ni equivalencia de rendimiento. |
| Desierto | Ondulaciones de arena y sombras más suaves aportan relieve tanto de día como de noche; las parcelas y construcciones mantienen lectura. | Conservar el ajuste aprobado. No añadir agua para completar una casilla de QA: este bioma es seco. |
| Volcanes | El suelo diurno es menos azulado, con separación de ceniza y roca. De noche las zonas oscuras siguen dominando, pero se percibe más estructura que en la referencia. | Conservar; no cambiar la lava aprobada. Esta cámara no incluye un borde de lava representativo. |
| Gran Cañón | Se aprecia estratificación en la pared, detalle de arena y una ribera gradual con agua menos turquesa. Cultivos y edificios mantienen su silueta. | Conservar. Los pequeños reflejos nocturnos requieren la evidencia temporal separada; una imagen no demuestra su estabilidad. |

## Alcance

Esta revisión cubre la apreciación artística de la cámara elevada en calidad
media para los seis biomas y ambas horas. No aporta nuevos benchmarks, no mide
microdetalle a resolución nativa y no sustituye las vistas normales/cercanas,
las secuencias temporales ni la comprobación del renderer actual.

No aparece en estos montajes un defecto que justifique rediseñar los materiales
aprobados. La recomendación es mantener las seis direcciones y reunir la
validación técnica restante con sus condiciones explícitas. El objetivo global
continúa abierto; no se equipara este pase de revisión con el cierre del juego.

## Comparativas

- [sabana](sabana.jpg)
- [gran-rio](gran-rio.jpg)
- [manglares](manglares.jpg)
- [desierto](desierto.jpg)
- [volcanes](volcanes.jpg)
- [gran-canon](gran-canon.jpg)
