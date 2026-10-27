# Manglares: transición de hojas hacia corredores

Seis parejas reales,semilla712,media,1280×720,día/noche. Control:patio nativo con corte duro. Candidata reduce tamaño de hojas durante2.5 unidades fuera del corredor conservador de3.625; conserva el desgaste original dentro. El desgaste efectivo de borde nunca supera.25,evitando nuevas exclusiones. No cambia densidad ni geometría base.

[Comparativa diurna](comparison-day.jpg): reduce borde recto especialmente en vista elevada. Conservar candidata. Sigue pendiente contraste entre hojas y musgo y repetición perceptible; no es la calidad global buscada todavía.

Cámaras,horas,instancias,triángulos,buffers yllamadas iguales en seis parejas,sin errores ni overflow. Reutiliza atenuación del shader existente; cálculo adicional durante construcción de tiles. Sin medición GPU/CPU en este pase; igualdad de triángulos no implica igualdad de coste. Pendiente benchmark de cubierta de patio completa,movimiento,ocupación dinámica yrefresh del snapshot de asentamientos.

Reproducir capture-mangrove-yard-edge-20261021.mjs y package-mangrove-yard-edge-20261021.py con Vite5190. audit.json registra contadores verificados. Solo QA,V10 intacta.
