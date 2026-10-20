# Validación de arena normal-only: streaming y coste

## Error reproducido y corregido

Al activar el material tras recorrer día/noche en la misma página aparecía `GL_INVALID_OPERATION: glTexStorage2D: Texture is immutable`. [Diagnóstico previo](streaming/failure-media.json). Sustituir `Texture.source` sobre el objeto ya subido no era seguro en esta secuencia.

El helper ahora clona las propiedades del sampler en una textura nueva, asigna la imagen, actualiza las referencias de los materiales residentes y del horizonte y libera la textura anterior que pertenecía a BiomeGround. Los nuevos materiales reciben el mapa actual. No dispone las texturas originales de la caché de assets. La variante normal-only reemplaza un objeto por otro; ya no se afirma que conserve la misma identidad de textura. No se añade una textura neta al mundo por diseño, aunque sí hay convivencia transitoria durante el cambio. No se ha medido el pico de RAM/VRAM de esa operación.

El benchmark se corrige también para alternar objetos de textura y sus uniformes, sin volver a mutar fuentes inmutables. Retiene ambas variantes para la comparación; su memoria no debe confundirse con la de una única variante instalada.

## Streaming real

`node tools/experiments/check-desert-aerial-sand-streaming.mjs`: campaña semilla 712, calidad media/baja, 1280 × 720, reloj visual fijo. Objetivo inicial +50/+30 m respecto al poblado. Recorrido por desplazamientos Z absolutos 0,144,288,0; en cada parada, día 150 y noche 350. Es muestreo de posiciones con espera de carga, **no una prueba de cámara moviéndose continuamente**.

20 capturas candidatas incluyendo la referencia inicial. En cada parada hay 25 materiales residentes y un horizonte. Se inspecciona el GLSL de la cadena completa, parámetros UV 1/30, fuerza uniforme 1 y jitter 0; todos enlazados a las rutas normal-only y contorno geométrico. Se comprueba además la existencia de shaders compilados por WebGL. Cero errores de consola/HTTP/JavaScript y GL después de la corrección. Los conjuntos de chunks cambian al alejarse y se recuperan al volver, con cámara de retorno idéntica.

[Media](streaming/media.json), [baja](streaming/baja.json). [Inicio baja](streaming/baja-start-day.webp) / [retorno baja](streaming/baja-return-day.webp).

El retorno cambia 1614–1842 píxeles según fase/calidad, máximo 28–36 niveles RGB. Se ejecuta el mismo recorrido sin helper (`WG_SAND_CONTROL=1`), con otras 20 capturas. El control cambia 85–123 píxeles, máximo 33–37. Fuera de los píxeles que cambian en el control, la candidata tiene como máximo nivel 3 en un píxel por prueba diurna y nivel 2 nocturno. La mayor parte del residuo adicional es muy pequeña; no es identidad binaria ni se ha aislado una causa única de cada diferencia. [Resumen cuantificado](validation-summary.json), [control media](streaming/control/media.json), [control baja](streaming/control/baja.json).

## GPU y CPU de la candidata final

Primera medición propia de normal-only después de corregir la propiedad de texturas. Intel UHD 0x9A60, ANGLE D3D11, Chrome WebGL2, fixture real 26, 1280 × 720. ABBA por calidad y fase: 16 bloques de 180 muestras, **2880 muestras GPU**. La revisión de Río se cierra durante el benchmark y se reabre después. No hay compresión ni otra captura nuestra concurrente; no se controla toda la carga del sistema.

| Calidad / luz | GPU A ms | GPU B ms | Delta ms | CPU envío A/B ms | Deriva GPU A/B ms |
|---|---:|---:|---:|---:|---:|
| Media / día | 10.749 | 12.275 | +1.526 | 4.425 / 4.854 | .089 / 1.872 |
| Media / noche | 12.087 | 12.774 | +.687 | 4.354 / 4.461 | .256 / 1.391 |
| Baja / día | 9.047 | 9.385 | +.338 | 3.601 / 3.777 | .033 / .011 |
| Baja / noche | 10.398 | 11.088 | +.691 | 3.904 / 4.294 | .492 / 1.650 |

Promedios de las medias de los dos bloques por variante; deriva es diferencia entre esos bloques. Baja diurna presenta controles cercanos y coste adicional pequeño, ~3.7%; no extrapolarlo a media/noche. La variación de las otras condiciones impide aprobar un coste estable. No repetir el mismo benchmark hasta obtener un valor favorable.

60 llamadas en todos los bloques; 455343 triángulos en media y 440052 en baja, iguales entre A/B. No nuevas pasadas. CPU es envío de render y no todo el motor. Se conserva un 404 de consola sin URL identificada en cada página; no se afirma consola completamente limpia. No aparecen errores de textura inmutable en estos registros. Las vueltas A/A2 del conmutador son exactas de día; noche cambia tres píxeles (máximo4) en media y dos (máximo1) en baja.

[Datos media](normal-only-performance/media.json), [datos baja](normal-only-performance/baja.json). Reproducir con `WG_MATERIAL_STUDY=desert-aerial-sand-normal-only`, `WG_PAIR_QUALITY=media` o `baja`, y `WG_PAIR_OUTPUT` apuntando al JSON correspondiente, ejecutando `benchmark-desert-aerial-sand.mjs`. No sobrescribir el `paired.json` histórico del material de dos mapas.

## Recomendación

Conservar normal-only como candidata QA. El fallo de activación queda resuelto y el enlace de materiales sobrevive al recorrido probado. No integrar aún en global-lighting ni main: faltan estabilidad temporal de las crestas con cámara móvil, más vistas del poblado/caminos y una decisión de presupuesto que contemple media/noche. Este pase no añade geometría ni toca simulación. El viento 8× permanece intacto. La calidad global no está completada.
