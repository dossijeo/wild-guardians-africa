# Contratos de render del maíz derivado

Diagnóstico nativo de la fuente congelada `25210ffc`, capturado desde main
`ca259c89`. Mismo piloto TRAINING que el [rechazo anterior](../crop-derived-double-rejected/README.md):
maíz maduro, clock 1,75, Sabana/día, azimut 26,25°, elevación 32,5°.
Cuatro brazos DoubleSide; no FrontSide ni sombras adaptadas o benchmark.

Tres controles originales exactos. Original reindexado exacto y aprobado en
esta única vista. Los dos brazos derivados .75 siguen fallando: 50 píxeles
faltantes/224 añadidos, de ellos 13/159 más allá de un píxel del contorno.
La instrumentación no cambia la decisión de calidad ni habilita promoción.

La captura de un mismo contexto GL muestra el mismo programa, fuentes,
uniformes activos, metadata de texturas, matrices y formato de atributos en
todos los dibujos del mesh maduro. El original reindexado y el derivado de un
material hacen un dibujo; el derivado partido hace dos. Metadata CPU conserva
materiales, mapas, UV transforms, normalScale, matrices, hashes iGrowth e
instanceMatrix. Ningún brazo tiene atributo tangent. El cambio de índice y
datos de vértices es esperado y no está acreditado como equivalente.

Las cajas de geometría coinciden; la esfera del original/reindexado tiene radio
1,2209732132104758 y los derivados 1,0665873530596046. No se registra cambio de
uniformes activos asociado: esa diferencia por sí sola no demuestra causa del
rechazo. Tampoco los contratos iguales prueban texels GPU, interpolación,
derivadas del normal map, oclusión o identidad de rasterizado. No concluir que
solo la distancia geométrica del tallo explica las regiones RGB.

`analysis.json.gz` conserva la salida del comparador del subagente;
`report.json.gz` conserva contratos y métricas completas. Se incluyen fuentes
QA comprimidas verificadas contra `git show 25210ffc`; originales intactos.
Consola vacía. Imagen de comparación retenida en la página tras liberar GPU;
pestaña 777 cerrada después. Campañas CPU 20024/49032/41320/41304 confirmadas
activas antes de ejecutar. Sin timings ni afirmación de máquina inactiva.

Verificación: `node docs/qa/crop-derived-contract-audit/verify.mjs`. Comprueba
integridad y los resultados descritos, no aprobación topológica/multivista ni
beneficio GPU. Sigue pendiente un candidato que supere todos los criterios del
encargo. Evidencia enviada al subagente para orientar alternativas conservadoras
y reparación/derivación reproducible sin relajar los umbrales.
