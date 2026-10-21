# Manglares: corregir la dirección de representación

Revisión del mockup original3-13514.jpg adjunto en el worktree Africa yde la escena V8/pruebas recientes. La referencia presenta hojas pequeñas con silueta,solapamientos yacumulaciones cerca de árboles ybordes. La textura de musgo actual aporta detalle,pero no puede crear esas siluetas. No se exige replicar geometría ni distribución del mockup píxel apíxel.

Auditoría de AfricanToon:la ruta biomeGround para uBiome<4.5 usa brdf4,relleno ambiente yespecular continuo,con filmic4;no aplica africanToon4 en esa rama. Por tanto,no corresponde atribuir las filas a bandas toon ni abrir otra sustitución de iluminación sin evidencia. AO multiplica tanto directo como ambiente;podría afectar contraste,pero no genera hojas con silueta.

Inventario GLB en assets.json:detalle Manglares78 triángulos,altura.456;esculpido128 triángulos,altura.271 antes del escalado. El selector actual tiene baja probabilidad de distribución yglobalScale2.0. Son recursos existentes,no una demostración de cubierta continua. No se inspeccionaron visualmente estos GLB en este pase;no se deduce su calidad solo del recuento.

Siguiente experimento concreto:unidad baja de hojas anchas creada en Blender,repetida como superficie con instancing yLOD,reutilizando máscaras de cobertura/humedad/desgaste/agua/ocupación existentes. No planos cruzados ni aumento indiscriminado de matas decorativas. Calcular triángulos por área antes de fijar densidad. Mantener textura de musgo como fondo ytransición lejana. Preservar edificios,modelos originales yterreno autoritativo. Comparar con la mejor candidata de dos escalas,con cámara/semilla/hora iguales,día/noche ycoste cuando la GPU esté disponible.

Este pase define la hipótesis a partir de evidencia;no ha implementado esa cubierta,no certifica mejora visual nueva ni rendimiento. No cambiar defaults ni descartar las candidatas previas. La representación debe evaluarse como cubierta continua,con el criterio artístico del usuario,no como plantas aisladas técnicamente funcionales.

No se descargaron assets,se modificó simulación ni se contactó con core. Main intacta.
