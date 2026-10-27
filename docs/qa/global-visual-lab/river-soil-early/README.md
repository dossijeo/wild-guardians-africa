# Tierra del río: omitir la hierba completamente sustituida

Candidata QA de optimización de la receta V2; no cambia la dirección artística. Solo cuando Gran Río tiene desgaste >= .70 y no está en modo de depuración devuelve directamente la capa de tierra. En mezcla conserva la ruta anterior. La opción nueva queda desactivada por defecto incluso en el helper V2.

[Comparación diurna media](gran-rio-media-day-pair.webp) · [Nocturna media](gran-rio-media-night-pair.webp)

Izquierda: V2. Derecha: salida anticipada. Ambas incluyen tierra, misma paleta, sombras, hierba y geometría. No es comparación con el juego sin tierra ni con main.

## Equivalencia visual

24 capturas, 12 parejas: Gran Río, semilla 712, 1280×720, baja/media, día 150/noche 350, tres poses. 8 parejas RGB exactas; otras cuatro suman cinco píxeles distintos, máximo un nivel RGB. Inspección del par normal medio diurno. Cámara, objetivo, hora, instancias, llamadas, triángulos y buffers coincidentes; sin errores registrados ni overflow. [Trazas](captures.json), [comparación](comparison.json), [detalle de paridad](parity.json).

El primer piloto sin sincronizar ocultaciones mostró 400 píxeles distintos en una vista diurna. Se repitió con updateObstructions en modo snap por pose; esa diferencia desapareció salvo un nivel en un píxel. El piloto queda excluido de la equivalencia final y sus PNG se conservan localmente. No atribuir el error inicial a la iluminación sin separar el estado de ocultación.

## Operaciones y límites

En suelo totalmente dominante se evitan las tres lecturas de color/normal/ARH de hierba y cálculos de mezcla. El POM de hierba ya estaba desactivado allí por V2: no atribuir a esta salida un ahorro adicional de ocho muestras POM. La máscara de contexto y las tres lecturas de tierra se mantienen. No cambian texturas, memoria prevista, geometría ni pasadas.

Las coordenadas y derivadas de tierra se calculan antes de la bifurcación; se evita obtener derivadas después de que algunos fragmentos hayan salido. La salida conserva color, normal normalizada, rugosidad, AO, humedad cero y materialCover410. No se ha validado aún equivalencia de una secuencia completa ni streaming específico de esta variante.

## Reproducción

Capturas y benchmark por separado, Vite 5190:

```powershell
node tools/experiments/capture-river-soil-early.mjs
python tools/experiments/package-river-soil-early.py
node tools/experiments/measure-river-soil-early.mjs
python tools/experiments/audit-river-soil-early.py
```

PNG originales locales; pares seleccionados, datos y herramientas publicados. Producción/main intactos.

## Benchmark móvil y decisión

**No adoptar como optimización: ahorro GPU no demostrado.** Intel UHD 0x9A60, ANGLE D3D11, calidad baja. Ocho bloques totales A/B/B/A por día y noche, páginas nuevas, 30 frames de calentamiento por fase de medida, 120 muestras GPU y 180 frames de cadencia separados por bloque. Total 960 GPU/1.440 cadencia. Auditoría de trayectoria, geometría por frame, estado y temporizadores aprobada. Sin errores, descartes ni consultas pendientes. [Datos](performance/benchmarks.json), [resumen](performance/summary.json).

Rangos de las dos medias en ms:

| Medida | V2 | Salida anticipada |
| --- | ---: | ---: |
| GPU día | 11,11–11,65 | 11,44–11,68 |
| GPU noche | 11,62–12,13 | 11,42–13,43 |
| CPU render día | 4,56–4,84 | 4,83–5,13 |
| CPU render noche | 4,59–4,71 | 4,48–4,49 |
| Intervalo día | 17,37–17,37 | 17,46–17,46 |
| Intervalo noche | 17,46–17,65 | 18,01–18,01 |

8,728 subidas de grupos por frame en ambas variantes, geometría igual. No son medidas de todo el tráfico GPU. Dos bloques no son intervalos de confianza; frecuencia y carga externa no controladas. CPU excluye simulación y los intervalos son entradas al render, no presentación. No comparar contra datos de otra sesión como si fueran controles contemporáneos.

La reducción teórica de tres lecturas en suelo completamente dominante puede quedar compensada por bifurcación, trabajo de grupo o caché; esta serie no identifica cuál. No atribuir una causa concreta sin perfilado. Se conserva el prototipo y la opción desactivada, sin sustituir V2. La capa de tierra sigue siendo candidata visual con coste pendiente de aceptación; este ensayo no elimina ese límite.
