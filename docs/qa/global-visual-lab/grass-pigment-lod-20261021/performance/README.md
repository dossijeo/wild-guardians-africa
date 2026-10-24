# Benchmark rechazado por consulta GPU imposible

A/B/B/A original frente a viento+normales+pigmento LOD,Intel UHD,media,1280x720,semilla712,cámara fija,viento animado. La auditoría falla deliberadamente: último bloque control nocturno contiene una muestra GPU960777.191702ms, incompatible con la duración de la ejecución. El resto de ese bloque20.856ms mínimo; no se elimina la muestra ni se calcula conclusión temporal favorable.

Datos crudos completos en benchmarks.json. No se publica summary.json válido ni se aprueba rendimiento. La causa exacta no está demostrada; una consulta del driver/temporizador defectuosa es hipótesis. No usar esta ronda para justificar integración. Repetir en salida distinta conservando el fallo.

Scripts measure-grass-pigment-lod-20261021.mjs y audit-grass-pigment-lod-20261021.py en tools/experiments. El auditor debe seguir rechazando estos datos.
