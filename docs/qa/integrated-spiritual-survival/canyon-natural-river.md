# Gran Cañón: río como defensa natural

Implementación exclusiva de la rama experimental integrada. No se ha fusionado con main ni aprobado el equilibrio de 100 noches.

## Reglas y sistemas reutilizados

- `Navigation.terrainValid` bloquea el agua para animales; la excepción del cañón corresponde únicamente a trabajadores. El control de cada desplazamiento físico y las recuperaciones de pendiente respetan esta distinción.
- Las consultas de contorno en `boundary-gates` usan el terreno hostil: orillas y acantilados completan el grafo de perímetros sin crear entidades de muralla ficticias. Las puertas siguen requiriendo accesos válidos de trabajadores. Continúan vigentes las restricciones de piezas enteramente acuáticas y de edificios parcialmente acuáticos.
- El daño agrícola físico en área tampoco atraviesa el río. Su comprobación usa la clasificación nativa de agua y se ejecuta únicamente al resolver impactos, sin trabajo adicional por frame.
- Antes de aceptar un nuevo asentamiento del cañón se exige una ruta positiva, con radio 1,1 m del facóquero inicial, desde un punto terrestre a 32 m hasta una posición plantable y accesible para trabajadores. Se comprueban segmentos y, si hace falta, hasta 16 búsquedas nativas acotadas. Esto prueba un acceso, no que todas las especies deban compartirlo. No se abre ni modifica ninguna defensa del jugador.
- La búsqueda inicial cooperativa cede durante las consultas nuevas. La versión síncrona y la asíncrona producen el mismo emplazamiento con la misma semilla.
- Una entrada seca en otra meseta o margen no basta. La selección de entrada del cañón comprueba aproximaciones a objetivos reales y reutiliza la alternativa de cámara proyectada, con dos búsquedas acotadas por ancla. Se conserva la certificación exterior y no se generan animales dentro del recinto.

## Evidencia

`canyon-natural-river-native-v6.json` conserva hashes de fuentes y consultas nativas en seis mundos: semillas 712, 123 y 2026, culturas Mapungubwe y Saheliana. Las 30 comprobaciones individuales (cinco especies por mundo) encuentran nacimiento seco y aproximación al centro de trabajo. También se validan doce oleadas completas: doce facóqueros y dieciséis animales mixtos por mundo, sin posiciones acuáticas ni superposición. No son campañas económicas ni una medición de daño realizado.

`canyon-natural-river-native-v1.json` conserva el fallo encontrado: entrada seca en una meseta sin aproximación a la finca. La versión v2 es exploratoria y anterior a corregir una alteración accidental de codificación en la edición; v3 conserva la corrección de entradas individuales; v4 conserva el fallo de la formación mixta rígida; v5 valida la disposición escalonada por la orilla; v6 repite esa aceptación con las fuentes definitivas y finales de línea normalizados. No se atribuyen ventajas de balance a esos resultados exploratorios.

Regresión: navegación de trabajadores y animales, movimiento real de retirada en un antiguo guardado Musgum, recarga, puertas, reservas individuales, colisiones, impactos en área y asentamientos de las cinco culturas. El perímetro de prueba de tres lados pagados más río produce una puerta y conserva el acceso de trabajadores. Un impacto real mata la planta de contacto y no daña la planta de la otra orilla. Una isla sintética se rechaza. Las pruebas nuevas y sus recibos TAP están junto a este informe.

No se cambian precios, presupuestos de golpes, radios militares ni tamaños de hordas para compensar esta corrección. Las campañas anteriores donde los animales cruzaban el río se conservan como históricas; la calibración futura del cañón debe usar esta regla nueva. No se afirma QA visual móvil ni benchmark GPU.

## Oleadas y coste

La alternativa del cañón conserva todo el grupo. Busca una disposición escalonada en una cuadrícula terrestre acotada, coloca primero los cuerpos más anchos, pero devuelve los actores en el orden original. Cada nacimiento y salida se valida con navegación nativa, con separación de cuerpos y con aproximación a un objetivo físico. Solo se acepta el grupo completo después de su certificación exterior. No cambia el RNG ni borra animales presupuestados.

En esta máquina, las consultas medidas de doce cuerpos cuestan 163–384 ms; las mixtas de dieciséis, 356–2.704 ms. Son tiempos CPU de selección nativa con cachés parcialmente calientes por las consultas individuales anteriores, no GPU, no frametimes ni carga fría universal. La preparación de entradas del juego ya ejecuta esta selección en su worker; la ruta síncrona de respaldo sigue siendo costosa si no dispone de preparación válida. Hace falta medirla en la batería integrada antes de promover la rama. No se afirma ausencia de tirones en móvil.

El test de doce facóqueros ejecuta movimiento y animación lógica nativos hasta un `StructureHit`, comprobando que todos los desplazamientos permanecen fuera del agua. La prueba de dieciséis especies mezcladas verifica determinismo, formación completa, separación y salidas secas. No constituyen una campaña de supervivencia ni un porcentaje de destrucción calibrado.

La batería final conjunta pasa **175/175 pruebas** en 43,80 s. La compilación Vite final pasa en **10,19 s**, con el aviso de tamaño de chunk ya existente.
