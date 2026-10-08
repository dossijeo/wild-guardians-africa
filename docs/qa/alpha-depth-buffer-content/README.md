# Alpha depth: contenido real de buffers GPU

QA sobre main af2914fe más las fuentes experimentales exactas comprimidas en este directorio. Volcanes/Mapungubwe, seed 712, media, reloj y cámara fijos, framebuffer 1280×720. No se modifica producción ni se acepta la ruta alpha experimental.

El observador copia mediante WebGL2 `COPY_READ_BUFFER` el contenido completo de cada buffer de atributos habilitado y del índice inmediatamente después del dibujo seleccionado. Restaura el binding en `finally`, sin modificar el binding de índices del VAO. SHA-256 se calcula después sobre copias inmutables. Límites: 8 MiB por buffer y 64 MiB acumulados; superar un límite rechaza la captura, sin truncar. Las pruebas incluyen mutación bajo la misma identidad, restauración por errores y rechazo por presupuesto.

La primera comparación sin observador (`before`) dio cero diferencias en los siete pares. Sin píxeles distintos, el selector por raycast no tenía candidatos y rechazó la selección vacía. Por eso se añadió selección QA explícita de un lote residente (`probeAssetGroup=18:2`, Afloramiento volcánico), documentada en cada resultado. No se infiere propiedad exclusiva del fragmento a partir de esta selección.

Tras recargar con selección explícita, el control sin lectura (`explicit-before`) reprodujo siete píxeles distintos G/B1, N2/B1 y B1/B2; B2/N3 fue cero. Los controles N1/N2, N2/G y N2/N3 fueron cero.

Dos comparaciones posteriores con lectura completa (`probe`, `repeat`) capturaron un dibujo del lote seleccionado en cada uno de los seis frames N1/N2/G/B1/B2/N3. Cada secuencia copió 38 buffers, 187.632 bytes, con siete identidades distintas. Todos los hashes y tamaños de cada identidad coinciden entre observaciones y ambas secuencias. Los buffers comunes de posición, UV, matrices de instancia, visibilidad e índices permanecen idénticos; normal/tangent también son estables cuando están habilitados en la ruta nativa.

Pese a ello, ambas secuencias reproducen siete píxeles distintos en G/B1 y N2/B1. La primera da B1/B2 cero y B2/N3 siete; la repetición invierte esas dos cifras. Máximo delta de profundidad normalizada 0,00001996755599975586. Los tres pares de control nativo permanecen cero. No hay errores de fixture ni advertencias/errores de consola en la captura archivada.

Esto descarta cambios de los bytes observados como explicación de estas diferencias. No prueba igualdad de texels, estado completo del driver, propiedad del fragmento, validez visual general ni ausencia de comportamiento indefinido del shader. El readback puede sincronizar el driver y no sirve para medir GPU/frametime. Se conserva la variabilidad de las comparaciones en lugar de declarar éxito a partir de la primera secuencia con cero diferencias.

Diecisiete pruebas dirigidas pasan; syntax checker: 149 HTML, 146 scripts, cero fallos. `node docs/qa/alpha-depth-buffer-content/verify.mjs` comprueba hashes de las quince piezas archivadas, cobertura de todos los buffers habilitados del dibujo, copias completas, estabilidad de hashes y discrepancias nativas. El siguiente diagnóstico debe centrarse en evaluación/rasterización del shader alpha, manteniendo los controles nativos y la ruta experimental fuera de producción.
