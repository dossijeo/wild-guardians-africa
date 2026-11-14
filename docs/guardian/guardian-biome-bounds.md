# Límites de autoría para colocación del guardián

La colocación autoritativa necesita límites de cada elemento del bioma para comprobar sus volúmenes de oclusión. Varios slots de manglares, cañones y desierto carecían de esos datos: la carga de metadatos fallaba y Attack se rechazaba. No se relaja la comprobación de geometría ni se cambia ningún vértice.

Los límites ausentes se obtuvieron de las posiciones empaquetadas de todos los LOD mediante `node tools/guardian-biome-bounds.mjs --write`. El comando conserva los límites ya presentes y modifica solo los ausentes; las pruebas comprueban los seis catálogos y recalculan los límites añadidos desde sus binarios. Si se regeneran modelos ya dotados de límites, su pipeline de autoría debe actualizar también esos límites.

Si falla la carga de metadatos, la simulación continúa y la acción conserva su rechazo autoritativo con la causa disponible. La corrección de metadatos no elimina otros rechazos por geometría o secuencia obsoleta.
