# Preparación individual de árboles en el prototipo

setTreeReadiness(id,0..1) añade un atributo por instancia compartido por la fórmula de crossfade de modelo e impostor. Readiness0 mantiene el impostor aunque esté cerca y descarta el modelo. Readiness1 termina la transición cerca. La preparación global sigue disponible para pruebas de retención completa; se multiplica por la individual.

Actualiza solo el ID afectado y su rango de atributo, sin modificar posiciones ni matrices. El atributo de modelos se empaqueta con los mismos índices de NearTreeSelection, incluyendo cambios de cámara y slots. El estado no se asigna por número de slot. Si no cambia, no se vuelve a subir; datos inválidos se rechazan. Esto es infraestructura experimental, fuera del runtime activo.

Prueba nativa con ocho árboles visibles, atlas8vistas128, iluminación real, cámara[0,10,25]. Botón Retener/liberar primer árbol controla solo prototype-tree-0. Captura held: preparación0, impostorVisibility1; rampa: reporte preparación0.0332, visibilidad0.9668; final: preparación1, impostorVisibility0. Hay4 modelos enviados al render (incluye instancias descartadas por shader; no significa4 modelos visibles). Durante la liberación matrixUploads permanece1 y selectionScans2; readinessUploads sube únicamente durante la rampa. Capturas y reportes no son atómicos entre sí y pueden reflejar avances de unos frames en la rampa. GL0/errors[], consola vacía.

12 pruebas pasan(398.63ms): nueva prueba verifica árbol retenido/vecino intacto,180 consultas quietas sin subidas adicionales, liberación gradual y traslado de cámara con reordenación de slots. Incluye pruebas de cobertura nativa y matemáticas.

Pendiente: conectar cobertura por ID de chunks y preparación de recursos GPU, persistencia por ID entre regiones, supresiones en ambos brazos y fade en los meshes nativos del juego, integración con render-origin/culling/grupos/sombras. No se acredita aún rendimiento GPU comparable tras añadir el atributo, imperceptibilidad visual ni integración terminada. Los lotes GPU anteriores corresponden a sus fuentes archivadas, no a este shader nuevo.
