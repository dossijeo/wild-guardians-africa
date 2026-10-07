# Controles del material del puente: no acreditan una solución

Fuente aed394ff (main 91382b8 integrado), Sabana/Mapungubwe/media y misma pose elevada nocturna a 220 m del baobab. Se conservan geometría y sus 93.478 triángulos/19 llamadas en B; el baseline permanece 53.762/14 en 120 muestras por lote. Campañas CPU 40968/41304 de fondo. No otra escena GPU ni benchmarks/build raíz durante las mediciones. El control nativo final sí coincidió con una verificación funcional CPU breve de urgentWork en raíz: no es un entorno CPU vacío.

GPU medianas A1 → B1 → B2 → A2, en ms:

- Material básico diagnóstico: 4,329271 → 6,707760 → 9,889219 → 4,426380.
- Material nativo con uFineNoise 0 en clon privado: 4,170052 → 11,426354 → 11,382682 → 4,244635.
- Material nativo restaurado: 4,163490 → 11,053333 → 10,933255 → 4,063958.

Todos: 480 queries, disjoint 0, estado exacto, errores/GL 0. La versión básica conserva map, alpha bias .65, side, dither, clipping y flags de depth, pero cambia radicalmente la iluminación: nunca una sustitución visual aceptada. La versión sin ruido preserva receta, relojes y texturas; solo reemplaza el uniforme privado en onBeforeCompile. Tampoco acredita mejora respecto al nativo. La deriva B1/B2 del básico impide una atribución precisa.

Control posterior nativo sobre 8fee8114 (runtime aed394ff), en la misma pose: los cuatro draws de basic utilizan MeshBasicMaterial y no tienen activos los uniformes de ruido/entorno. Los cuatro draws de no-noise utilizan MeshStandardMaterial privado con uFineNoise=0, uNight=1 y entorno habilitado; los cuatro draws nativos restaurados tienen uFineNoise=1. En cada modo las 15 instancias mantienen identidad lógica, matrices GPU y fades exactos, con GL 0 y consola vacía. Ambos modos diagnósticos declaran nativeShaderProofApplicable=false. Se archivan los informes completos en uniforms; esta comprobación posterior confirma la aplicación de la receta, pero no convierte los timings anteriores en medidas nuevas ni demuestra equivalencia visual.

Sin activación de gameplay ni PR aceptada. Se conservan todas las muestras para decidir siguientes controles de LOD/selección por tamaño; no atribuimos el coste solo al ruido o ALU por hipótesis.
