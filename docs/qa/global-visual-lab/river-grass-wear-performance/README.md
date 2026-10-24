# Coste de la transición por desgaste de Gran Río

Campaña real pausada con motivo menu, semilla712, iluminación global,1280×720, cámara normal del área de vegetación. Media/baja, día/noche, orden ABBA por condición. Cada bloque reconstruye la cobertura, espera1200ms y mide30frames de calentamiento+120frames:16 bloques/1920 muestras GPU. Viento8, tiempo frame/30. No captura ni compresión concurrente durante medición; escritorio y carga externa no aislados.

A es la cobertura original C; B mantiene módulos, máscaras y alcance, pero reduce altura al acercarse al umbral de desgaste. Es una mejora artística con imagen diferente, no una optimización a imagen idéntica. Ambos shaders son los mismos: cambia la altura de instancias y el cálculo visual de preparación.

| Calidad/hora | GPU A ms | GPU B ms | B−A ms | CPU render A/B ms |
| --- | ---: | ---: | ---: | ---: |
| Media día | 14,924 | 14,356 | −0,568 | 3,662/3,650 |
| Media noche | 15,266 | 16,110 | +0,844 | 3,517/3,648 |
| Baja día | 9,950 | 11,280 | +1,330 | 4,402/4,499 |
| Baja noche | 11,188 | 10,359 | −0,829 | 4,177/4,061 |

Medias de dos bloques por variante/condición; todos los datos conservados, sin retirar picos. No hay ventaja consistente. La geometría proyectada cambia al reducir altura y puede cambiar fragmentos/overdraw; no se mide overdraw directamente. CPU envuelve WorldScene.render, incluye preparación del frame, no toda la simulación ni presentación. GPU consulta externa del mismo render, no latencia de entrada ni cadencia total.

Auditoría:120 muestras válidas por bloque, cero errores, disjoint, descarte, pérdidas de contexto o consultas pendientes. Cámara, objetivo, hora, resolución, llamadas/triángulos e instancias/buffers coinciden por condición. Media67draws/850650triángulos; baja63/502089. Estos contadores incluyen el envío del render auditado y esta pose; no sustituirlos por los del capturador estático anterior.

Preparación separada: setup completo original44,3–96,8ms; candidata34,5–81,4ms. Contadores build y selection completos en summary.json. **Se solapan**: construir tiles ocurre dentro de selección, no sumar ambos. Setup incluye creación y primer render, no es una medición pura de generación. El intervalo nocturno/diurno y JIT/GC no se aíslan; no atribuir los valores menores solo a reutilizar offsets. La carga global de campaña no está representada por el coste de la cobertura aislado.

Reproducción: servidor5190; `node tools/experiments/measure-river-grass-wear.mjs`, después `python tools/experiments/audit-river-grass-wear.py`. WG_COVER_QUALITY selecciona perfil; predeterminado ambos. El helper se reconstruye en cada cambio usando dispose del anterior. Primer intento falló antes de medir por URL de módulo virtual con ?import; se corrigió para servir la transformación Vite y repetir tras salida confirmada. La serie final terminó sin errores.

**Recomendación:** conservar candidata QA por mejora de frontera demostrada en capturas/viento; no afirmar ahorro ni integrarla todavía. +1,33ms en baja diurna merece atención en la validación conjunta, pero la variación impide atribuirlo con certeza al cambio. Evitar nuevas rondas idénticas buscando un promedio favorable. El siguiente ensayo global debe incluir la receta en su presupuesto combinado, con alternativa desactivable y controles de campaña, y avanzar el suelo de Cañón/Volcanes pendiente.
