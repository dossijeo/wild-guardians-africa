# Subidas separadas de matrices y visibilidad — QA

La variante mantiene el agrupador original y sus draw calls. Cuando cambia el sello del grupo, compara un sello adicional de identidad, LOD, conteo, versión de matrices y transformación. Si solo cambió visibilidad, copia/sube únicamente ese atributo. Conserva la ruta completa ante origen invalidado, grupo nuevo, cambios de matrices o compactación omitZeroColor. Sombras sin optimización. No elimina empaquetado por cambio de LOD.

Prueba ejecutable: `node tools/experiments/test-split-asset-uploads.mjs`. Comprueba reutilización de versión de matriz cuando cambia cobertura, actualización de transformación, desplazamiento del origen y compactación de instancia invisible. Pasa. No sustituye validación GPU ni streaming.

Capturas reales: Sabana baja, semilla712,1280×720, normal/oblicua/inversa día y noche. Misma cobertura, calls y triángulos. Cuatro de seis parejas RGB exactas. Inversas:84píxeles de día máximo169 y96 de noche máximo121. Causa no aislada; no afirmar equivalencia visual completa. Archivos locales y comparison.json. El sello adicional se calculaba también en control durante estas capturas; antes de medir se condicionó al flag para evitar cargar el control con ese trabajo, sin cambio de lógica de selección/render.

Benchmark móvil ABBA en curso con `node tools/experiments/measure-split-asset-uploads.mjs`; no atribuir aún ganancia de rendimiento. Auditoría prevista con `python tools/experiments/audit-split-asset-uploads.py`, que verifica igualdad de calls/triángulos por fotograma y resume matrices cuya subida se evitó. Contador de grupos, no tráfico real GPU.

Todo se aplica mediante intercepción QA, sin modificar producción. Reproducir capturas con `node tools/experiments/capture-split-asset-uploads.mjs` y `python tools/experiments/package-split-asset-uploads.py`, servidor5190.
