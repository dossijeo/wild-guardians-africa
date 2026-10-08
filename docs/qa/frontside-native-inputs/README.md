# Controles nativos de cultivos y datos GPU del trabajador

Dos ensayos locales sobre la rama de reparación, commit congelado a73ad920.
Main era 9fa3827c. Siete PIDs CPU confirmados vivos antes de abrir las escenas;
no se midieron tiempos ni se declara beneficio GPU. No cambia producción.
Ambas escenas se liberaron y las pestañas 778/779 se cerraron después de
exportar los informes, framebuffer y captura de interfaz. Consolas warn/error
vacías. Fuentes primarias exactas del commit congelado y hashes en el recibo.

## Maíz: tallo de 658 caras, todavía DoubleSide

TRAINING GUIDED_EXISTING, limit=1, Sabana día, maduro, reloj 1,75,
elevación 32,5°, azimut 26,25°, framebuffer 1024 por brazo. Los tres controles
originales son exactos. Original reindexado: PASS exacto. Los dos brazos con
tallo reducido: FAIL, 55 píxeles ausentes, 193 añadidos, 13 ausentes y 149
añadidos más allá de un píxel del contorno; maxTileMae 0,14401417527.
No se dibujaron caras inversas ni se probó ahorro FrontSide aquí.

La auditoría confirma iguales matrices, iGrowth, instanceMatrix, materiales,
programa GLSL, uniforms y metadata de texturas; layout de atributos igual.
No hay tangentes. AABB iguales, esfera original 1,220973 y derivada 1,066587,
sin cambio de uniform activo observado. Esto no identifica la causa de las
diferencias: geometría, normales e interpolación siguen siendo distintos.
El rechazo anterior de .75 permanece; 658 también queda rechazado.

## YoungMale original: lecturas frente a nuevos dibujos

SOURCE_ONLY, noShadows, Idle fracción 0, primer caso de closedSubsetV1,
sourceStateAudit+sourceGpuInputs, limit=1. No se dibuja candidato. Doce
lecturas síncronas consecutivas del mismo framebuffer: cero bytes distintos.
Treinta dibujos del original: controles de 0 o 21 bytes distintos, máximo 59,
alpha siempre igual; siete píxeles RGB forman la región observada.
maxTileMae 0,0107574372863 supera el gate de control 0,01: permanece inválido.

En los 31 dibujos Mesh0 registrados, los siete VBO/index leídos tienen
fingerprints FNV-1a idénticos. La textura float de huesos 12×12 se puede leer
en los 31 casos: framebuffer completo 36053, cero valores no finitos, 2304
bytes, FNV e21e9964 igual en GPU y CPU. Programas, estado, uniforms, matrices,
atributos y metadata de texturas también coinciden. La extensión float estaba
disponible. No hubo fallback sin lectura presentado como éxito.

Los fingerprints no son prueba criptográfica de igualdad. No se leyeron los
texels GPU de mapas estáticos, entorno o profundidad, ni se observaron todas
las pasadas de la escena. Estas lecturas perturban el renderer y no demuestran
la causa del jitter. Acotan la diferencia a nuevos dibujos, sin resolver todavía
el control inválido ni aprobar assets, rigs, categoría o benchmarks.

Verificar archivo: `node docs/qa/frontside-native-inputs/verify.mjs`.
Siguiente paso: el subagente prepara una variante que restaura normales por
correspondencias verificables P+UV; deberá pasar sus propias comparaciones,
incluida silueta, y no hereda ninguna aprobación de este diagnóstico.

## Seguimiento: 1738 normales originales restauradas

Nuevo TRAINING Double-only, commit fa4a03bd, mismo caso y contratos,
stemAnchorNormals. Conserva P/UV/topología de 658; restaura únicamente las
1738 correspondencias P+UV con normal original única. Cuatro esquinas
ambiguas y 232 nuevas/movidas permanecen sin restaurar. No usa el resultado
visual para resolver esas correspondencias. Todos los controles originales
siguen exactos; el original reindexado coincide. Consola warn/error vacía.

Ambos brazos derivados FAIL. El alpha permanece igual al de 658: 55 ausentes,
193 añadidos y 13/149 más allá de un píxel. La MAE del brazo sin partición baja
de 0,00224052745 a 0,00211543989; maxTileMae baja de 0,14401417527 a
0,14147551171. La mayor región RGB aún tiene 1268 píxeles. El brazo con dos
grupos tiene MAE 0,00211507539 y el mismo maxTileMae. Es una mejora modesta,
insuficiente para aprobar calidad. No demuestra la causa general de los
errores restantes ni beneficio FrontSide; no se cambia el gate.

Tab 780 cerrada tras exportar informe/framebuffer/captura y liberar GPU.
Las cuatro campañas CPU seguían vivas; la suite de root ya había terminado.
Fuentes exactas y commit independiente en anchorFollowup del recibo.
