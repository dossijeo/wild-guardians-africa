# Menos transformaciones al apoyar las bestias

Base `03eaef6`. El ajuste de altura de cada bestia transformaba cada vértice
de apoyo a coordenadas mundiales y después al espacio del padre. Ahora compone
esa matriz una vez por malla y calcula únicamente su fila de altura. Se
conservan todos los vértices originales de apoyo, skinning, evaluación de pose
y margen del suelo. No hay caché entre frames ni cambios de lógica, escala,
animaciones, materiales o sombras. Sin padre se reutiliza la matriz identidad.

66 pruebas dirigidas correctas. Los cinco GLB originales se contrastan contra
la fórmula anterior en72 poses por especie: caminar, correr y cuatro ataques,
con escala, inclinación, padre trasladado hasta4800m y modelo sin padre.
Máximo cambio de altura observado:2,274153088066555e-13m, tolerancia1e-9m.
Las pruebas incluyen recarga, fases de ataque, pose fija, preparación de rigs
y origen flotante; no se mutan los datos de juego.

El benchmark utiliza geometrías, skins y clips originales, omitiendo imágenes.
Contra la fuente congelada de03eaef6, se elimina exactamente dos aplicaciones
de matriz por vértice de apoyo. El conteo incluye también las transformaciones
internas de skinning, que permanecen:

| Bestia | Vértices de apoyo | applyMatrix4 anterior / actual por muestra de pose |
| --- | ---: | ---: |
| Facóquero | 232 | 1714 /1250 |
| Hiena | 1077 | 7222 /5068 |
| Búfalo | 1180 | 8436 /6076 |
| León | 1435 | 9389 /6519 |
| Rinoceronte | 1235 | 8044 /5574 |

ABBA:40 llamadas de calentamiento y120 medidas por grupo. Promedios de las dos
medianas de cada brazo, en milisegundos, para pose estática y cambiante:

| Bestia | Estática anterior → actual | Cambiante anterior → actual |
| --- | --- | --- |
| Facóquero | 0,1430 →0,1245 | 0,1516 →0,1430 |
| Hiena | 0,5250 →0,4825 | 0,5184 →0,5200 |
| Búfalo | 0,6216 →0,6048 | 0,6593 →0,6000 |
| León | 0,7152 →0,6778 | 0,7506 →0,6728 |
| Rinoceronte | 0,5642 →0,5413 | 0,6462 →0,5682 |

Se conserva el contraejemplo de hiena cambiante y todos los grupos/medias/p95.
Hay campañas y suite del subagente concurrentes; el ensayo no demuestra una
ganancia estable de frametime ni FPS. La comparación adicional de40 poses de
carrera por especie conserva matrices mundiales y de huesos con error cero.

Build correcto14,59s, advertencia preexistente de bundle grande. Paquete correcto:
641 archivos/382702538 bytes/859 enlaces relativos/20GLB, sin duplicados
originales. `tests.log.gz`, `build.log.gz`, `package.log.gz`, `benchmark.json` y
hashes fijan esta revisión. Reproducir el benchmark con
`node tools/benchmark_animal_ground.mjs OUTPUT.json`.

No acredita captura visual nativa actual, GPU, móvil, memoria física, audio,
balance ni campaña completa. La reducción demostrada corresponde al trabajo
de CPU de apoyo; el render de una finca grande conserva otras prioridades.
