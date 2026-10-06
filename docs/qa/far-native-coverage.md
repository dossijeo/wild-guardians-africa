# Puente experimental de cobertura de chunks nativos

NativeTreeCoverage consulta los batches reales de createAssetLod/updateAssetLods. Un chunk instalado puede tener meshes con count0: no es suficiente para sustituir un impostor. El puente devuelve por ID si existe una instancia de color ya empaquetada en alguno de los bins LOD de la especie; comprueba visibilidad de chunk/mesh/material y orders correspondientes. No usa sombras como prueba de representación en color.

Mantiene caché por batch y versiones de matrices, count y visibilidad. Ciento ochenta consultas de cámara quieta no vuelven a recorrer las instancias. Al cambiar bins, visibilidad, reconstruir props o descargar chunks, actualiza los IDs; utiliza contadores para conservar un ID compartido hasta retirar su último propietario. Supresiones se consultan directamente, incluyendo antes de que termine la reconstrucción visual.

Pruebas utilizan Three y los constructores/updateAssetLods/refreshResidentProps reales: carga previa a empaquetado, render listo, frames quietos, mesh/material/chunk oculto, supresión, restauración, nueva preparación y descarga; filtrado por especie y propietarios compartidos. Mantienen geometría y tareas de streaming intactas.

Limitaciones: este módulo sigue fuera del runtime activo. Matrices CPU empaquetadas no acreditan compilación de shaders/subida de texturas GPU; la integración deberá combinar ambas condiciones. Tampoco resuelve el fade por instancia ni integra render-origin, sombras, obstrucción, culling de grupos o todos los biomas. No declara terminada la transición ni rendimiento móvil. Próximo paso: consumir cobertura por ID en representación lejana conservando el impostor hasta preparación GPU y crossfade completo.
