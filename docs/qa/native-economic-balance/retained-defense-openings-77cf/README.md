# Testimonios físicos de pasos abiertos en los perímetros retenidos

Se ejecutó `node tools/probe-retained-defense-openings.mjs OUT_NUEVO` contra las dos snapshots originales77cfb1ac, con SHA comprobado y sin avanzar reloj, RNG ni aplicar comandos. El diagnóstico usa navegación actual después de PR21; se verificó que la serialización del estado no cambia. Los resultados son inspección geométrica de un estado fijo, no una nueva campaña ni QA visual.

El último rectángulo previsto es `[72,-18,102,18]`,61 posiciones nominales. Para cada especie y su radio real se comprobaron segmentos perpendiculares a esas posiciones: extremos completamente dentro y fuera del rectángulo, ambos walkable y segmento nativo clear sin ignorar sólidos.305 muestras por caso.

- Good:60 piezas compradas acumuladas,73 segmentos transitables entre las305 muestras. Son testimonios por especie/radio/posición, **no73 agujeros distintos**. Demuestran que ese perímetro no intercepta todo acceso directo; las compras no acreditan una defensa cerrada.
- Expansive:94 piezas acumuladas y cero pasos directos encontrados en este muestreo. **No demuestra cierre global**, acceso útil de trabajadores por puerta ni protección frente a todas las rutas posibles.

Las piezas compradas incluyen iteraciones anteriores del perímetro: no debe equipararse su número al número de posiciones cubiertas en la última frontera. La causa de cada apertura (capital disponible, exclusión de colocación o alineación entre iteraciones) necesita diagnóstico separado antes de cambiar la política de construcción.

Estos datos impiden etiquetar a good como finca eficazmente defendida por el mero gasto. Las futuras campañas deben observar intercepción real, reparación pagada y pasos de invasión, conservando el coste económico completo. No se modifica el motor ni se aplica una reducción artificial de daño.
