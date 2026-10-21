# Invalidación de datos derivados de LOD

Variante QA `engine-lod-gate`, construida sobre `engine-selection`. No sustituye la investigación de agrupación persistente: elimina primero trabajo redundante observado en el perfil, sin atribuirlo a limitaciones de JavaScript o WebGL2.

El renderer original vuelve a recorrer matrices de sombras y cobertura de cada lote cuando cambia la clave cuantizada de cámara, aunque las listas de instancias por LOD sean idénticas. La candidata reconstruye sombras solo cuando cambia alguna lista y empaqueta cobertura cuando cambia la lista o la versión del atributo fade. Los eventos de obstrucción siguen invocando `batch.packCoverage` directamente, como antes. No cambia rangos LOD, población, modelos, cámara, culling ni iluminación.

La inspección de los escritores confirma que las matrices fuente de estos lotes se reconstruyen en asset-lod.js al cambiar el orden; las sustituciones de población crean nuevos lotes. El parche es exclusivo de la ruta QA. Una futura ruta que mutase matrices independientemente de las listas necesitaría invalidación explícita y no queda certificada por este prototipo.

Reproducir con `WR_ORDER=engine-selection,engine-lod-gate,engine-selection,engine-lod-gate`, `WR_FIXED_RESIDENCY=1`, `WR_OUT` nuevo y sin `WR_PROFILE_LOD`, ejecutando measure-wild-renderer.mjs. Auditar mediante audit-wild-renderer.py con `--lod-gate`.

## Resultado: sin ventaja demostrada

La auditoría pasa equivalencia estricta: todas las capturas de día/noche son idénticas entre variantes y repeticiones, y coinciden cámara, draws y triángulos por frame. 1.440 muestras GPU válidas y 2.880 frames de cadencia, sin errores registrados. No hubo cambios de residencia durante las ventanas.

| Fase/bloque | CPU A → B | Intervalo A → B |
|---|---:|---:|
| Día 1 | 8,037 → 14,629 ms | 17,233 → 22,203 ms |
| Día 2 | 15,217 → 14,137 ms | 20,761 → 20,536 ms |
| Noche 1 | 6,791 → 13,684 ms | 18,137 → 22,404 ms |
| Noche 2 | 14,956 → 14,974 ms | 21,082 → 21,262 ms |

No existe mejora consistente. Los controles A también cambian mucho entre repeticiones, incluido el agrupador no modificado, por lo que la serie no permite atribuir toda la variación al parche. No se omite ningún bloque ni se selecciona la segunda pareja diurna para justificarlo. La equivalencia demuestra corrección en este recorrido, no rentabilidad.

**No promover.** Conservar como variante QA reproducible, sin habilitar por defecto. El siguiente trabajo debe seguir atacando el recorrido/selección/agrupamiento persistente y evaluar su efecto global; esta invalidación aislada no resuelve el objetivo de reducir la preparación. No se descarta ninguna mejora artística por este resultado.

[Resumen](lod-gate-abab/summary.json), [datos completos](lod-gate-abab/benchmarks.json), [día](lod-gate-abab/day-pair.webp), [noche](lod-gate-abab/night-pair.webp).
