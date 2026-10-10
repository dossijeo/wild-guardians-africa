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
