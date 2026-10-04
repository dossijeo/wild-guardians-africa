# Actualización CPU de cultivos

Referencia previa: `54ee5e9`. Se elimina la copia completa de cada planta en cada frame usando una pose temporal síncrona con los campos de presentación necesarios. Una caché acotada a ocho muestras reutiliza recetas botánicas cuando especie y progreso coinciden exactamente. No retiene plantas ni crece con el historial de cosechas. Las recetas, matrices, alturas, semillas, viento, UV, materiales y subidas parciales conservan su comportamiento.

`node tools/benchmark_crop_uploads.mjs 600 180` ejecuta el actualizador de producción con 40 geometrías sintéticas de caja y 32 puentes, ocho especies, 600 plantas y capacidad 1024. Calienta 60 actualizaciones y mide 180 por escenario. El cuarto argumento opcional permite importar un módulo de referencia local. La comparación previa se ejecutó con el módulo de HEAD exportado a .cache y su import de rules ajustado a la URL del archivo original.

| Escenario | CPU p50 antes, ms | CPU p50 después, ms |
| --- | ---: | ---: |
| Maduras | 6,077 | 0,637 |
| Morph pausado | 5,954 | 0,258 |
| Crecimiento de una cohorte | 7,553 | 0,522 |
| Crecimiento con fases distintas | 7,604 | 0,374 |

Los cuatro hashes de matrices y atributos coinciden exactamente antes/después. Cada escenario mantiene 108000 consultas al suelo. Los casos estables mantienen también sus versiones de buffers, incluso al cambiar el reloj del viento. Resultados completos en before.jsonl y after.jsonl; 22 pruebas de subida parcial, GLB nativo/restauración y origen gráfico pasan, además de build.

El visor crop-native-reload.html mostró las ocho especies y sus cuatro puentes al 50 % de morph (32 plantas, 32 lotes, cero errores). Guardar y reconstruir el renderer conservó el dominio y devolvió cero píxeles distintos en su comparación interna. native-restored.png y native-restored-ax.txt registran ese resultado. Es una prueba de restauración con el código optimizado, no una comparación visual entre revisiones ni una escena de finca completa.

Son dos ejecuciones secuenciales en Node con otras tareas activas, no una distribución estadística ni una medición GPU. La geometría sintética aísla el trabajo CPU del actualizador; no demuestra FPS de finca completa, rendimiento de teléfono físico ni una mejora equivalente del frametime total. Sigue pendiente medir ese impacto en una escena de juego activa.
