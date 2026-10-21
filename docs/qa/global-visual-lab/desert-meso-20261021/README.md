# Desierto: capa de relieve mesoscópico

Seis parejas reales, semilla 712, media, 1280×720, vistas normal/elevada/inversa, día/noche. Original V10 izquierda, candidata derecha. Cámaras, objetivos, horas, triángulos y draw calls coinciden; sin errores WebGL/consola capturados. audit.json registra los contadores. No se modifica geometría ni siluetas.

La capa suma dos campos de ruido de mundo (escalas .18 y .43; amplitudes .85 y .22) y obtiene su gradiente mediante derivadas de pantalla y la base tangente de la superficie. Perturba la normal existente, conservando la textura de ondas pequeñas, color y sombras. Se atenúa por pendiente, desgaste y huella del píxel (.6–2 unidades). No son alturas físicas nuevas ni hay oclusión geométrica de esas acumulaciones.

Revisión de ambas hojas: volumen visible en las laderas y las zonas lisas, especialmente en la vista inversa; calidez y legibilidad conservadas. Conservar candidata para validación adicional, sin integración por defecto. El fondo lejano muestra cierta apariencia arrugada: revisar atenuación y movimiento antes de promover. Las sombras de edificios permanecen geométricas y no siguen este relieve simulado.

No añade texturas, geometría, draw calls ni pasadas. Añade dos evaluaciones de materialNoise y operaciones de derivadas/normalización por fragmento. No se ha medido GPU/CPU: el último sondeo de recursos mostró carga externa y no hay cifras atribuibles a esta variante. Faltan benchmark sin contención, calidad baja, movimiento de cámara y estabilidad de coordenadas con streaming. No se considera terminado el objetivo global.

Reproducir capture-desert-meso-20261021.mjs y package-desert-meso-20261021.py con Vite 5190. PNG locales regenerables; hojas y metadatos publicados. Main y valores predeterminados intactos.
