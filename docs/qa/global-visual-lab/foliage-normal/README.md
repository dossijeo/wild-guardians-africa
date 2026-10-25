# Mayor contribucion de normales del atlas en follaje

Piloto aislado del suavizado de bandas. Cambia la mezcla de normal geometrica/mapa de 0,10 a 0,35 en pixeles de follaje de materiales nativos tipo 1. Conserva la mezcla posterior con la normal de copa, la fuerza del mapa original, todos los mapas y la geometria. No toca paletas ni siluetas.

24 capturas en Sabana, Gran Rio y Manglares, overview/low, dia/noche, semilla 712, calidad media y objetivo +50/+30 m fuera del poblado. Doce parejas verificadas en comparison-audit.json; cero errores de captura. Las normales adicionales no muestran una mejora convincente de volumen: el detalle del atlas sigue siendo el mismo y los cambios son pequenos.

[Sabana antes](sabana-base-low-day.png) / [despues](sabana-candidate-low-day.png). [Rio general antes](gran-rio-base-overview-day.png) / [despues](gran-rio-candidate-overview-day.png). [Manglares antes](manglares-base-low-day.png) / [despues](manglares-candidate-low-day.png).

La camara baja de Rio queda parcialmente obstruida. river-raised/ contiene una comprobacion adicional con la camara de asentamiento elevada y el mismo objetivo fuera del poblado. No usar el encuadre obstruido como evidencia suficiente del conjunto.

## Coste y decision

Sin geometria, draws o texturas nuevos: solo cambia una constante en una mezcla existente. Eso no demuestra coste temporal cero. No se mide GPU para este piloto, porque el beneficio visual no justifica promoverlo. No integrar ni combinar con la rampa suavizada. Las variaciones de contadores de texturas entre cargas no son cambios de memoria causados por el parche.

La cobertura nativa fuera del claro es mas rica de lo que sugerian las capturas centradas en edificios. Antes de anadir mas matas, mantener en QA vistas de paisaje y de aldea, y distinguir forma geometrica, detalle de material y escala de textura. Para crear detalle nuevo no basta con amplificar un atlas que ya describe las formas existentes. No se modifica simulacion, navegacion ni balance.

Reproducir con WG_GRASS_STUDY=foliage-normal, WG_CAMPAIGN_TARGET_OFFSET=50,30 y capture-campaign-grass.mjs. Para river-raised usar WG_GRASS_BIOMES=gran-rio y WG_GRASS_VIEWS=settlement.

La comprobacion elevada termina con cuatro capturas adicionales (28 en total), dos parejas verificadas y sin errores. Confirma que el aumento de normales no aporta detalle nuevo suficiente. Siguiente ensayo: detalle nuevo de hojas modeladas en Blender y horneado para copas, manteniendo la geometria original; no repetir otro aumento del mismo mapa.
