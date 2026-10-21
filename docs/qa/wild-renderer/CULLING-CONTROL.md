# Revisión de la comparación de culling

La conclusión anterior no cierra la hipótesis del usuario. El prototipo mueve la transformación, prueba de esfera y compactación de la pasada de color, pero no toda la preparación gráfica. No demuestra todavía que una arquitectura persistente por eventos elimine la penalización completa de CPU.

## Control añadido

`measure-wild-renderer.mjs` admite ahora `unculled`: desactiva exclusivamente `qaInstanceCull`. Conserva el culling de chunks, sombras, LOD, materiales, cobertura C y viento 8. `base` activa la misma prueba por instancia en JavaScript. `engine-events` activa la prueba equivalente con registros persistentes WASM y datos de Engine actualizados por eventos.

La secuencia es A/B/C/A/B/C, con páginas nuevas, día/noche, misma trayectoria de cámara, semilla 712, calidad baja y 1280×720. Se fija la residencia de los mismos 49 chunks para aislar el empaquetado del streaming. Este control no sustituye una validación posterior con streaming normal. Los buffers GPU pueden actualizarse con distinta frecuencia entre variantes; es parte del comportamiento que se mide, no una condición supuestamente idéntica.

## Trabajo que permanece fuera de WASM

Inspección de `src/rendering/asset-groups.js` y `src/rendering/wild-renderer/incremental.js`:

- `NativeAssetGroups.update` recorre los chunks, actualiza matrices mundiales y consulta límites espaciales.
- Recorre lotes y niveles, establece capas, construye objetos de entrada y dos mapas de agrupación de color/sombras cada fotograma.
- `prepare` calcula capacidad y gestiona recursos. La ruta incremental evita el sello de cadenas de color, pero conserva el resto del agrupador y la preparación de sombras.
- `IncrementalWildRenderer.pack` vuelve a recorrer entradas, consulta versiones de población, transformaciones, órdenes LOD y visibilidad. Los registros nativos son persistentes; su selección todavía depende de metadatos generados en JavaScript.
- El cálculo anterior de LOD y las rutas de cultivos/actores no se trasladaron al módulo.

Por eso no basta con medir el núcleo WASM. `groupCpuMs - packMs` permite cuantificar el coste residual dentro del agrupador; no es una medida aislada de la construcción de mapas y no incluye todas las etapas anteriores del renderer. No se sumará al tiempo completo de render porque ya está incluido en él.

## Reproducción

Con Vite en 5192:

```powershell
$env:WR_OUT='docs/qa/wild-renderer/culling-control-abcabc'
$env:WR_ORDER='unculled,base,engine-events,unculled,base,engine-events'
$env:WR_FIXED_RESIDENCY='1'
node tools/experiments/measure-wild-renderer.mjs
python tools/experiments/audit-wild-renderer-culling-control.py docs/qa/wild-renderer/culling-control-abcabc
```

La auditoría exige repetibilidad de contadores dentro de A y equivalencia B/C por frame, además de cámara, residencia, dispositivo y temporizadores GPU válidos. No exige igualdad de triángulos entre A y B: precisamente se mide su reducción. Conserva las diferencias de imágenes y no certifica equivalencia si hay residuos.

## Resultado del control (Intel UHD)

Doce bloques completados: 2.160 consultas GPU válidas y 4.320 frames de cadencia. Sin errores GL, cambios de estado ni creaciones de chunks durante las ventanas. Cero discrepancias de cámara/draws/triángulos entre repeticiones de cada carga equivalente. Todas las capturas diurnas coinciden exactamente. De noche aparecen diferencias de 7 píxeles con delta máximo 1, también entre dos repeticiones sin culling; no se certifica equivalencia estricta ni se atribuyen automáticamente todos los residuos a la misma causa.

Rangos de las medias de dos repeticiones; no intervalos de confianza:

| Medida | Sin culling por instancia | Culling JS | Culling WASM por eventos |
|---|---:|---:|---:|
| Triángulos medios/frame | 1.296.844 | 595.310 | 595.310 |
| GPU día (ms) | 17,55–17,69 | 12,41–14,58 | 11,56–13,93 |
| GPU noche (ms) | 16,97–18,62 | 13,70–13,78 | 12,16–12,45 |
| CPU agrupador día (ms) | 1,80–1,88 | 1,92–2,10 | 1,62–1,75 |
| CPU agrupador noche (ms) | 1,81–1,99 | 1,72–1,95 | 1,53–1,56 |
| Intervalo día (ms) | 22,57–23,29 | 18,30–19,18 | 16,95–18,66 |
| Intervalo noche (ms) | 22,43–25,54 | 18,36–18,51 | 17,88–18,08 |
| Grupos subidos/frame | 11,40–11,49 | 47,99 | 47,99 |

**El ahorro del culling sí aparece respecto al control sin culling**: 54,1% menos triángulos enviados y menor tiempo GPU en todos estos bloques. La falta de mejora consistente discutida anteriormente se refería al incremento adicional de WASM respecto a JS con culling, no al beneficio total de activar el culling.

WASM reduce CPU del agrupador en las cuatro parejas (aproximadamente 9–23%), pero la cadencia diurna empeora en la segunda pareja y el p95 nocturno empeora en ambas. No hay base para prometer una mejora uniforme. Las variaciones GPU entre JS y WASM con los mismos contadores también aconsejan no atribuir toda la diferencia al núcleo nativo; frecuencias y cargas externas no están controladas.

**Limitación concreta descubierta:** el adaptador persistente vuelve a seleccionar cuando cambia la cámara y marca la salida como actualizada, aunque la lista visible resulte idéntica. Por eso mantiene 47,99 subidas de grupos por frame, igual que el prototipo JS inicial. No incorpora todavía la ventaja de la variante anterior que invalidaba por cambios efectivos de selección. La siguiente iteración debe conservar resultados/órdenes y evitar esa invalidación innecesaria, además de abordar la agrupación que permanece en JS.

En WASM, el residual del agrupador fuera de pack es 1,25–1,43 ms frente a 0,26–0,32 ms dentro de pack. Ese residual incluye preparación y gestión de grupos/sombras; no mide una única función. Reducir solo los ~0,07 ms del núcleo no resuelve ese coste. La hipótesis de una preparación nativa más completa permanece abierta.

[Datos y métricas](culling-control-abcabc/summary.json), [comparativa día A/B/C](culling-control-abcabc/day-abc.webp), [comparativa noche](culling-control-abcabc/night-abc.webp). La inspección de la lámina diurna no muestra cambios visibles de composición o densidad. La auditoría de píxeles sigue siendo la que informa los residuos nocturnos.
