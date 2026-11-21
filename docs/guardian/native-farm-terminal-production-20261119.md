# Farm terminal conectada a Idle y aproximación

El productor adquiere ahora el sucesor de una Farm23 realmente terminada: Idle21 si el cuerpo ya está dentro del ancla original, o aproximación22 y después REST21 si está fuera. Sigue usando el cuerpo, el controlador, el despachador, los preparadores y las operaciones nativas existentes. Esta conexión añade el sucesor terminal al productor antes de abrir Farm en el roster de SimulationAuthority; dicho roster todavía permanece cerrado.

## Investigación y decisión

Antes del mecanismo se contrastó código real de [NavigationAgent3D 4.4.1](https://github.com/godotengine/godot/blob/4.4.1-stable/scene/3d/navigation_agent_3d.cpp#L843-L857). Distingue llegada y finalización y conserva el agente al detenerlo. Se adapta esa separación; no se incorpora su navegación ni una dependencia. El código local idleCycleSource ya derivaba cuerpo terminal, nacimiento Idle determinista y ancla original para las adquisiciones 21/22. Se expone una lectura acotada de esa misma fuente: cuerpo, ancla y necesidad de aproximación. La lectura no cambia Game, RNG, pose, tiempo, diario ni propuestas.

La validación del origen al consumir un resultado diferido se contrastó también con [DetourCrowd 1.6.0, updateMoveRequest](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L740-L791), leído antes de esta conexión. Se conserva la validación local de fuente; no se añade su cola ni su planner.

El lector exterior exige que los hechos y el plan de tareas estén asentados y que no exista una tarea elegida para ese actor. El productor selecciona los preparadores Idle existentes y conserva esa fuente/ancla en la identidad del intento. La comprobación se mantiene hasta el commit mediante el callback isCurrent ya empleado en la continuación Farm: hechos pendientes, trabajo seleccionado aún sin asignar, cambio de ancla o Home invalidan el candidato incluso sin otro wake. No se crea dueño, cola, reloj, ABI, algoritmo de locomoción ni dependencia.

Los dos harnesses GPU existentes ejecutan la frontera real de planificación antes de pedir el sucesor. No se modifica su fuente Farm, su adquisición gráfica ni sus criterios de conservación. El sucesor no se concede a partir de una posición aproximada o de una llegada JS; exige la ejecución terminal nativa y su tiempo vigente.

## Pruebas CPU y puertos

Los 30 casos nuevos pasan en 16.357s. Dieciséis recorren **13→23→21** o **13→23→22→21**, cuatro perfiles y standalone/pthread, con Game, fuente C++, productor, controlador, publicador y ambos MessageChannels reales. El fixture no realiza commits nativos directos para ese recorrido. Conserva cuerpo, fases y RNG; lee la fuente repetidamente sin mutar el diario y no selecciona Idle mientras Farm se mueve.

Diez casos invalidan 21/22 durante preparación por trabajo nuevo, trabajo ya seleccionado pero todavía sin asignar, Home, hechos del mundo pendientes o ancla cambiada, sin depender de un nuevo wake. Otros dos avanzan Game durante la preparación: la fuente retenida permanece estable y se adquiere con el tiempo ajustado. Dos comprueban la prioridad ordinaria de trabajo sobre Idle y de Home sobre trabajo. Los recursos retenidos, frame preparado y ACK de drenaje GPU del fixture CPU son dobles explícitos; no equivalen a dibujo hardware ni al roster ordinario.

El control final contra los módulos anteriores registra 30/30 fallos porque falta la lectura terminal; no se presentan como treinta defectos independientes. El primer candidato funcional falló por una carrera del fixture: avanzaba el reloj antes de que llegara por el puerto el release23 anterior. La guarda gráfica rechazó correctamente instalarlo en otro instante. Se espera ahora ese release real y la liberación del slot de recursos antes de avanzar; no se relajó ninguna guarda. Se corrigió además el nombre nativeIdleCycles del mensaje en el fixture. Los diagnósticos están archivados.

La selección pertinente completa pasa **2090/2090** en **122 archivos**, sin fallos ni omisiones, en 339.851s. Incluye Farm, Idle inicial/ciclo/Stroll, productor, suspensión/lifecycle, pausa y checkpoint. Las tres exclusiones históricas de host/timeline siguen abiertas; esta selección no las revalida ni sustituye la selección mayor anterior. Seis sintaxis y build WebGPU/Worker con dibujo remoto pasan; build 55.771s, advertencia conocida de chunks. Se fijan **642 entradas**, 64 entradas nativas y sus outputs sin cambios, 16 archivos ajenos y 38 rutas A5 externas intactos. No se reconstruye WASM.

## Hardware y recursos

Dos ejecuciones NVIDIA/Turing de los harnesses originales completan 21 y 22→21 con Surface, Host, puertos, picking, adopción y drenaje reales. Son autoridad en página, ancla/peer Home preparados explícitamente y operaciones preparadas directas después del arbitraje; **no** son todavía el productor dentro del roster de SimulationAuthority, paridad visual ni aceptación de cadencia. Captura timing sin PNG.

El relevo 23→21 conserva **652 IDs** de geometría/bancos, retira solo su textura de movimiento anterior y crea una textura nueva; prepara 98 recursos y crea 0 después de READY, con 45 dibujos durante 1800 ms y 150 en la ventana de fase. La aproximación 23→22 conserva **653 IDs**, reemplaza una textura de movimiento, prepara 70 recursos y crea 0 después de READY; 54 dibujos durante 1800 ms. Su REST 22→21 conserva esos 653 IDs, reemplaza una textura, prepara 98 recursos y crea 0 después de READY, con 54 dibujos durante 1800 ms y 150 en la ventana de fase. Los tres relevos registran 0 buffers nuevos de geometría y 0 shaders duplicados; mismos actores/rigs/geometrías/instancias y 0 errores. La aproximación desplaza el mismo cuerpo una vez adquirida 22; conservar cuerpo no significa conservar posición durante esa ruta.

Los conteos incluyen recursos de preparación y de bindings; conservar datos residentes y no asignar durante el draw no acredita minimalidad de cada copia ni resuelve globalmente las 3.123 reconstrucciones. Los recibos mantienen esa diferencia y no declaran cero tirones.

## Siguiente punto del plan

Habilitar y validar el cohort Farm restaurado en la autoridad ordinaria, ahora que el productor tiene inicio, parada, continuación, retorno Home y sucesor terminal. Mantener un único registro de cuerpos y las guardas de cohort mixto. Después resolver nacimientos/admisión incremental e independencia de nuevos lotes, fallo de consumidor/cohort y dispositivo, coste de pausa, autonomía VFX y aceptación integrada/cadencia/plataformas. A6/A/B/C siguen abiertos, D no iniciado; f-R3 conserva únicamente su cierre de seguridad acotado.

[Recibo de validación y hashes](performance/native-farm-terminal-production-validation-20261119.json).
