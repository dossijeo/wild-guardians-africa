# Coste de la arena seca corregida

Intel UHD 0x9A60 / ANGLE D3D11, HeadlessChrome 155, 1280×720, semilla 712, fixture AfricanToon caso 26, global-lighting. A: suelo original del laboratorio; B: receta completa normal-only con especular seco. **No se mide únicamente la multiplicación especular.** Los vídeos del directorio hermano comparan B con normal-only anterior, una referencia distinta y explícita.

## Serie larga

Misma página, orden ABBA BAAB, media/baja, día/noche. Cada bloque calienta 30 frames y mide 180. 32 bloques, 5.760 muestras GPU válidas. Consultas EXT_disjoint_timer_query_webgl2 envuelven todas las pasadas de world.render. CPU es envío de render; intervalos incluyen comprobaciones QA y temporizadores, no son FPS certificados de producción.

| Calidad / fase | GPU A ms | GPU B ms | Diferencia | CPU A/B ms | Intervalo A/B ms |
| --- | ---: | ---: | ---: | --- | --- |
| Media / día | 10,529 | 11,013 | +0,484 | 6,932 / 6,482 | 29,746 / 29,401 |
| Media / noche | 12,096 | 11,940 | −0,156 | 5,308 / 5,523 | 30,601 / 30,762 |
| Baja / día | 9,082 | 9,117 | +0,035 | 5,118 / 4,881 | 27,068 / 27,782 |
| Baja / noche | 9,494 | 9,544 | +0,050 | 5,496 / 5,577 | 27,992 / 28,893 |

Son promedios de las cuatro medias por variante. La GPU de controles media/noche sube de 11,199 a 13,064 ms dentro de la serie: **el signo negativo agregado no demuestra una optimización**. No se excluye ningún bloque. [Media](media.json), [baja](baja.json).

## Contraste intercalado

Para reducir la confusión por deriva se añadió un protocolo diferente: bloques de ocho frames ABBA, ocho ciclos por repetición. 32 frames de calentamiento recorren ambas variantes; luego 256 muestras (128 por variante). Tres repeticiones por calidad/fase: 12 bloques y 3.072 muestras válidas.

Se instrumenta únicamente en memoria el módulo html-proxy que Vite sirve para el fixture. El archivo de tests no cambia. Cada muestra conserva etiqueta de variante, contador, CPU y su consulta GPU por índice. El conmutador se ejecuta fuera del intervalo CPU, pero la revalidación de programa provocada por needsUpdate ocurre dentro del render: **su CPU no se presenta como coste de una integración estable**, ni su cadencia como FPS real del juego.

| Calidad / fase | Δ GPU repetición 1 | Δ repetición 2 | Δ repetición 3 |
| --- | ---: | ---: | ---: |
| Media / día | +0,593 | −0,136 | +0,434 |
| Media / noche | +0,726 | +0,396 | −0,498 |
| Baja / día | +0,418 | −0,388 | +0,432 |
| Baja / noche | +0,218 | −0,097 | −0,120 |

La intercalación no elimina la variación. No se escoge la mejor repetición ni se mezclan ambos protocolos para producir una aprobación. Los ciclos individuales también se conservan. [Media intercalada](media-interleaved.json), [baja intercalada](baja-interleaved.json), [resumen verificable](summary.json).

Un intento inicial de instrumentar el HTML falló antes de medir porque Vite servía el script mediante html-proxy. Se corrigió la ruta. Dos bloques de un piloto posterior calentaban solo A; se conservan en [piloto de calentamiento](media-interleaved-warmup-pilot.json) y se excluyen del protocolo final. El calentamiento final recorre A y B antes de registrar muestras. No se repitió por obtener un número desfavorable, sino para corregir ese defecto de método.

## Integridad y límites

En total: **8.832 muestras válidas finales**, ninguna consulta descartada, disjoint, desbordamiento, pérdida de contexto o error registrado. Cámara estable y estado simulado sin cambios. Las variantes envían 60 draws; 455.343 triángulos en media, 440.052 en baja. En el protocolo intercalado se comprueban esos valores en cada frame de ambas variantes. No se añaden pasadas ni geometría.

El chequeo de procesos no detectó otro runner Node de tools/experiments antes de la medición. Después apareció un proceso ajeno de QA musical creado a las 18:35:06 UTC; el último registro final era de las 18:34:23 UTC. Ese proceso concreto no explica retrospectivamente la deriva. No hay monitorización continua de todas las aplicaciones, frecuencias o energía GPU, por lo que tampoco se afirma aislamiento completo del escritorio.

Los contadores Three son objetos, no bytes VRAM. No se valida memoria residente, dispositivo móvil, partida avanzada ni streaming continuo mediante este fixture estático. La cadencia observada está instrumentada y no permite sumar CPU+GPU ni extrapolar directamente FPS de campaña.

## Decisión

La mejora visual y la corrección especular están respaldadas por capturas estáticas y recorrido de cámara. **No se reproduce una penalización grande, pero no se certifica el presupuesto de +0,5 ms en media/noche.** Mantener candidata QA sin integrar aún. No repetir esta misma microprueba hasta obtener un resultado favorable.

El siguiente contraste útil debe medir la cadencia del juego real sin consultas GPU por frame y el coste acumulado del conjunto visual. Hasta entonces, las medias favorables no justifican una aprobación global. Los datos de baja son alentadores, pero la dispersión impide extenderlos a otras calidades o biomas.

## Reproducción

Vite del worktree en 5190, sin otro trabajo GPU deliberado. Para cada calidad media/baja:

```powershell
$env:WG_PAIR_QUALITY='media'
node tools/experiments/benchmark-desert-sand-dry-specular.mjs
node tools/experiments/benchmark-desert-sand-interleaved.mjs
```

Después: `node tools/experiments/summarize-desert-sand-performance.mjs`. Los JSON completos y el resumen se versionan. Las capturas A/B/A2 auxiliares del temporizador se regeneran; las imágenes artísticas y vídeos están en el directorio padre y motion. El favicon se responde con 204 y los HTTP restantes se registran con URL; no se ocultan fallos de recursos.
