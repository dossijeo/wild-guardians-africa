# Muestras diagnósticas de hiena

La captura histórica ya genera muestras generales de estado para todos los
actores. Una segunda serie específica de hienas se utilizaba en herramientas
de diagnóstico y se validaba si estaba presente, pero no alimentaba la
certificación ni la reproducción. El arranque de producto con HUD proyectado
deja de generarla y transmitirla; los perfiles de diagnóstico y compatibles la
conservan. Los registros generales, eventos, trazas y pruebas de separación no
cambian. La opción se transmite explícitamente al Worker autoritativo.

Dos autoridades Wild Engine ejecutaron los mismos dos lotes con y sin la serie:
coincidieron snapshots, eventos y el resto de la evidencia. Una prueba adicional
usa el Worker real y la codificación incremental. En una muestra del fixture
`manglares-123-d10-raid-state`, un lote de dos pasos contiene una hiena y siete
muestras: la serialización JSON de la traza pasa de 273.379 a 272.248 bytes.
Es una sola observación de tamaño, no una medición de transferencia, CPU, GPU o
fotogramas; la mayor parte de la traza sigue existiendo y requiere revisión sin
perder información de seguridad. La migración y la validación de rendimiento
integrado siguen pendientes.
