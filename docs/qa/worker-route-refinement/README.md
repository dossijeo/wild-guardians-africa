# Candidato QA: refinar rutas cerca del límite de pendiente

Dos variantes aisladas sobre main f3b913da, sin cambios de producción.
Navigation conserva el chequeo nativo grueso. Si la pendiente máxima observada
en sus cinco muestras es >=0,46 y el tramo pasó, se comprueba cada <=0,025 m.
Se conserva el límite 0,5, radio original, barrido de obstáculos/props y
excepción de agua del cañón. El algoritmo fino también calcula pendiente de
workerSurface en Gran Cañón, pero estos ensayos son de Sabana, no aceptación
del cañón ni de todos los biomas. Los animales conservan el algoritmo original.

El conector nativo de 10 cm del diagnóstico anterior es rechazado. A* encuentra
un rodeo por (112,10), y walkTo llega al destino. Las 225 posiciones observadas
en pasos dt=0,01 son transitables, tanto en V1 como en V2. No se traslada al
trabajador ni se modifica la velocidad. Es un actor construido sobre terreno
nativo, no el recorrido histórico original ni una prueba continua matemática.

V1 tenía una caché heredada incorrectamente por Object.create(nav): un tramo
previamente despejado se reutilizaba en una vista con un edificio propuesto.
La comprobación sintética devuelve true donde el chequeo nativo devuelve false.
V2 crea caché propia por navegador/vista, la reinicia en setState y conserva sus
respuestas al plantar sin modificar props. Tres tests locales pasan: vista
propuesta separada, invalidación tras edificio y conservación tras crop-only.
Caché limitada a 10000 claves. V1 queda descartada por ese fallo.

Cada variante ejecuta cuatro continuaciones independientes ABBA de cien ticks
dt=0,1 del guardado histórico Sabana/Musgum, contratación pagada de 112
trabajadoras. 25 warmup y 75 medidos. Game es idéntico; Navigation difiere.
Serialización/hash fuera de medición. Las dos referencias coinciden entre sí,
igual que los dos candidatos. El candidato cambia trayectoria desde tick 1:
los tiempos no representan trabajo idéntico y no aíslan el coste del refinado.
Cuatro campañas CPU confirmadas vivas; posible breve solapamiento de Blender
en V1 comunicado por el subagente. No es benchmark GPU ni frametime renderizado.

| Variante | Mediana referencia combinada (ms) | Mediana candidato (ms) |
|---|---:|---:|
| V1 | 4,0616 | 3,5652 |
| V2 | 3,9147 | 3,5485 |

V2 por brazo candidato: 11270 comprobaciones, 550 hits, 235 tramos refinados,
17239 muestras finas y 38 rechazos. El coste observado justifica investigar,
pero **no aprueba calidad ni promoción**. El primer brazo de referencia es más
lento que el último; no se promete una ganancia general de CPU/FPS.
El campo sourceHashes.idle de los runners derivados contiene el hash de
Navigation original; su nombre heredado no significa que se modificase idle.

Comprobación de calidad separada, iniciada después de terminar V2 (timestamps
en recibo). Cada uno de cien ticks observa trabajadores transitables antes
que quedan no transitables después. Referencia: dos casos; V2: uno. Ambos
incluyen worker-53147 en tick 2. El refinado por muestras aún puede pasar por
alto una franja más estrecha: **V2 tampoco se integra en producción**.
Este observador consulta walkable y calienta consultas; no se usa como timing.
No cubre todas las posiciones entre ticks ni sustituye la campaña completa.

Siguiente paso: protección puntual de llegada en tramos identificados como
riesgo, con replanning que evite el punto inválido; mantener libertad de
movimiento, restauración de partidas, cachés aisladas y coste razonable.
No reducir el gate a mejorar de dos fallos a uno.

Verificar: `node docs/qa/worker-route-refinement/verify.mjs`.
