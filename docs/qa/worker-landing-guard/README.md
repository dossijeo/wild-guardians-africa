# Candidato rechazado: comprobar cada posición de llegada

Candidato exclusivamente QA sobre main 6a5a8547. Se añade una comprobación
terrainValid del extremo de cada desplazamiento en walkTo y paseo inactivo.
Conserva clear dinámico y deja salir a un origen ya inválido. No es una
restricción completa para esos orígenes ni incluye replanning tras rechazo.
No cambia los archivos de producción. Fuentes generadas exactas archivadas.

En el conector nativo de 10 cm documentado en worker-slope-recovery, evita
la llegada a la posición intermedia inválida: 30 intentos, 30 rechazos, cero
desplazamiento, trabajador permanece transitable. **No alcanza el destino**.
Por tanto, bloquear el paso por sí solo no resuelve la navegación.

Continuación nativa del guardado histórico Sabana/Musgum, contratación pagada
de 112 trabajadoras, cuatro ejecuciones independientes ABBA de cien ticks de
0,1 s. 25 warmup, 75 medidos por brazo; serialización/hash fuera del tiempo.
Cuatro campañas CPU confirmadas vivas. Sesión 37604 terminal exit 0.

| Brazo | Mediana tick CPU (ms) | Consultas añadidas | Rechazos |
|---|---:|---:|---:|
| Referencia A | 4,7540 | 0 | 0 |
| Candidato B | 6,7514 | 14055 | 199 |
| Candidato B | 6,4082 | 14055 | 199 |
| Referencia A | 3,5634 | 0 | 0 |

Medianas combinadas 4,3112 y 6,7264 ms. No atribuir la diferencia exclusivamente
al coste de terrainValid: los candidatos cambian el estado desde tick 2,
y no ejecutan el mismo trabajo que la referencia. Las dos referencias son
reproducibles entre sí, igual que ambos candidatos. No es tiempo GPU,
frametime renderizado, FPS móvil ni aceptación de cien noches actuales.
El paseo inactivo no produjo consultas añadidas en esta ventana; no está
benchmarked por estos datos. El rechazo funcional del conector ya impide
promoción independientemente del tiempo observado.

Siguiente evaluación: detectar riesgo y validar/replanificar durante la
preparación de rutas, con cachés de geometría invalidadas correctamente. Evitar
cobrar una consulta completa de terreno por cada paso de cada trabajador.
La recuperación marginal de regresos permanece activa y separada; no se
declara solucionado el origen de todos los bloqueos.

Verificar: `node docs/qa/worker-landing-guard/verify.mjs`.
