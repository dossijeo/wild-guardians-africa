# Subidas separadas de matrices y visibilidad — QA

La variante mantiene el agrupador original y sus draw calls. Cuando cambia el sello del grupo, compara un sello adicional de identidad, LOD, conteo, versión de matrices y transformación. Si solo cambió visibilidad, copia/sube únicamente ese atributo. Conserva la ruta completa ante origen invalidado, grupo nuevo, cambios de matrices o compactación omitZeroColor. Sombras sin optimización. No elimina empaquetado por cambio de LOD.

Prueba ejecutable: `node tools/experiments/test-split-asset-uploads.mjs`. Comprueba reutilización de versión de matriz cuando cambia cobertura, actualización de transformación, desplazamiento del origen y compactación de instancia invisible. Pasa. No sustituye validación GPU ni streaming.

Capturas reales: Sabana baja, semilla712,1280×720, normal/oblicua/inversa día y noche. Misma cobertura, calls y triángulos. Cuatro de seis parejas RGB exactas. Inversas:84píxeles de día máximo169 y96 de noche máximo121. Causa no aislada; no afirmar equivalencia visual completa. Archivos locales y comparison.json. El sello adicional se calculaba también en control durante estas capturas; antes de medir se condicionó al flag para evitar cargar el control con ese trabajo, sin cambio de lógica de selección/render.

Benchmark móvil ABBA completado con `node tools/experiments/measure-split-asset-uploads.mjs`; no atribuir aún ganancia de rendimiento. Auditoría completada con `python tools/experiments/audit-split-asset-uploads.py`, que verifica igualdad de calls/triángulos por fotograma y resume matrices cuya subida se evitó. Contador de grupos, no tráfico real GPU.

Todo se aplica mediante intercepción QA, sin modificar producción. Reproducir capturas con `node tools/experiments/capture-split-asset-uploads.mjs` y `python tools/experiments/package-split-asset-uploads.py`, servidor5190.


## Resultado ABBA

960 muestras GPU válidas,1440 fotogramas de cadencia, sin errores/disjoint. Cámara, calls y triángulos coinciden por fotograma; cobertura final coincidente en near/far/triangles/bufferBytes. Se evitan1.17–1.35 subidas de matrices de grupos por fotograma. El contador uploads general sigue contando grupos que actualizan visibilidad, por lo que no representa exclusivamente matrices.

| Métrica | Control | Separada |
|---|---:|---:|
| CPU render día, ms |4.932 /5.683 |4.999 /5.479 |
| CPU render noche, ms |4.926 /5.427 |5.167 /5.952 |
| GPU día, ms |15.208 /16.430 |15.197 /16.967 |
| GPU noche, ms |15.995 /16.956 |15.348 /16.968 |
| Cadencia p95 día, ms |32.8 /30.3 |28.7 /31.3 |
| Cadencia p95 noche, ms |29.9 /28.8 |33.7 /32.2 |

No mejora consistente demostrada. La serialización del sello adicional cuesta CPU, y el ahorro de matrices es pequeño. Conservar como diagnóstico sin integrar. Las texturas/geometría/calidad artística permanecen intactas.

Limitaciones: la caché de cobertura al cierre tiene48 tiles en el primer control y65 en el primer candidato; cobertura visible final y triángulos por fotograma iguales no prueban trabajo interno idéntico. No interpretar diferencias pequeñas como causalidad aislada. El tiempo GPU es consulta del render, CPU excluye simulación pausada y cadencia no es presentación. No se midió tráfico real GPU ni VRAM. Datos completos locales performance/benchmarks.json y resumen versionado performance/summary.json.

La vía que queda por probar para eliminar la reconstrucción por LOD es indirection de IDs hacia matrices residentes. Este experimento no la implementa ni permite concluir su rendimiento.
