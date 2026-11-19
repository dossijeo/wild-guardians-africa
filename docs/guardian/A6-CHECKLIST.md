# Seguimiento de cierre de A6

Continuación A4/e-R3/f-R4: [base completa de recursos retenidos](native-retained-checkpoint-base-20261119.md). Preparador existente reconcilia checkpoint completo por clave/revisión/contenido con read sets reales; cambios/altas y bajas con tombstone fuente, misma transacción/propietarios. Investigación React19.2/Three180 en código, sin dependencias. Baseline8 fallos nuevos→11/11 con10 nuevas;219 dirigidas/10,3673/3674 seleccionadas/295/una omisión,build48,99s;503inputs/64nativos intactos/16ajenos exactos. NVIDIA final conserva9chunks/175nodos/180generaciones vivas; alta de1chunk crea79objetos+1COW uniforme/1binding,0forks de vértices/texturas; checkpoint idéntico0creaciones,todas generaciones/drain conservados,cero errores. Ocho tentativas/raws íntegros y excepciones CPU vacías/targets ya destruidos documentadas. Solo recursos: Surface no recibe frontera/reloj ni imagen nueva. Siguiente integrar estado/presentación/replay y admisión final en Surface retenida; recuperación integral1.893 heredada,productor/cohort/paradas/relevos/cadencia/plataforma y A6/A/B/C abiertos,D no iniciado,f-R3 seguridad cerrado.


Continuación A4/e-R3/f-R4: [fence de uploads retenidos no publicados](native-retained-unpublished-buffer-fence-20261119.md). Identidad nativa estable/no usada por imágenes permite upload CPU en el mismo buffer; publicados no uniformes y lotes mixtos siguen protegidos, sin descartar bytes. Código real wgpu0c978d0 inspeccionado/destrucción diferida; sin dueño/dependencia/caché nuevos. Baseline3 fallos/2 negativos→5 nuevas pasan;206 dirigidas/7,3497/3498 seleccionadas/288/una omisión/siete exclusiones,5JS+1HTML/build46,26s.491inputs/64nativos intactos/16ajenos exactos. NVIDIA: readback123/19 IDs,1 COW uniforme+1 binding/0 forks no uniformes/drain; legado18 IDs/cero forks pasa. Sonda de mundo elimina error de fence y vacía uploads pero mantiene rechazo de frontera sin propuesta admitida; no recuperación saludable aceptada. Dos404 previos identificados/favicon corregido en fixture;cinco raws GPU íntegros. Siguiente admisión válida de base retenida;último rebuild1.893 heredado,productor/cohort/paradas/relevos/cadencia/plataforma y A6/A/B/C abiertos,D no iniciado,f-R3 seguridad cerrado.



Continuación e-R3/f-R4: [recuperación incremental, baseline actual y límites](native-incremental-product-recovery-20261119.md). Recorrido histórico3.123 ahora recrea1.893 recursos con mark-lost/fresh-surface: sigue sin ser incremental. Código real Babylon8.0 reset/NodeFrame Three inspeccionado; la sonda aislada con canales vivos rechaza frontera sin propuesta admitida y fence con uploads retenidos no publicados; errores íntegros, ninguna recuperación aceptada ni guard debilitado. Dos sesiones NVIDIA, seis dibujos del baseline/cero GPU errores, PNG revisado y raw gzip;487/64intactos/16exactos,483 previas intactas, sin producción/build/WASM nuevos;201 dirigidas/3492de3493/una omisión/build49,03s anteriores solo heredados. Siguiente reproducir esos dos límites en tests y adaptar admisión de base retenida/vida de uploads tras investigar código consolidado. Productor/cohort/paradas/relevos ordinarios, cadencia/plataforma y A6/A/B/C abiertos,D no iniciado,f-R3 seguridad conserva cierre.



Continuación e-R3/f-R4: [retirada del consumidor nativo fallido](native-failed-consumer-drain-20261119.md). Fallo/retirada/disposición comparten finalización GPU real; recursos admitidos hasta disposición y recibo existente ligado a conexión, idempotente sin token solicitado ficticio. Código Dawn095e430d inspeccionado; sin dependencia/dueño/caché/reinicio. Seis fallos baseline→seis pases;201 dirigidas/7,3492/3493 seleccionadas/288/una omisión/siete exclusiones históricas,6 sintaxis, build49.03s;483/64sin cambios/16exactos. NVIDIA negativo sin plantilla21 conserva20/rechaza ciclo y retira sin timeout; positivo98/96/98/68,cero tardíos/duplicados/drain. Host fallido no se recupera; cadencia no aceptada (ventana286.585ms/3>50). Siguiente recuperación incremental3.123 y productor/cohort/paradas/relevos ordinarios;cadencia/plataforma y A6/A/B/C abiertos,D no iniciado,f-R3 seguridad conserva cierre.



Continuación e-R3/f-R4: [REST/WATCH exterior desde20 en Surface/GPU](native-initial-idle-outside-surface-20261119.md). Guardado real, autoridad nueva y20→21→22→REST21 por puertos/Host/NVIDIA: REST/WATCH timing+visual preparan98/96/98/68,cero tardíos/shaders duplicados,649/650 IDs inmutables/actor/picking/fase/drain conservados. Regresión seleccionada100/68/98/68 pasa. Investigación DetourCrowd/Renderer Three real; comparador solo normaliza material de cuatro mallas ocultas, manteniendo todas las demás identidades/guards; fallo/sonda y11 pruebas/diez negativos retenidos. Pasan27 nuevas,132 seleccionadas/7 archivos/7 sintaxis;482/64/16 exactos, solo QA/nativo intacto, sin build nuevo.16 PNG revisados y7825 muestras;5916 con frontera,0 antes de adquisición. Ventana timing49,345/50,240ms(0/1>50),visual48,585/141,020ms(0/4);global hasta219,805ms,cadencia NO aceptada. Negativo sin plantilla21 rechaza/cuerpo20 retenido, pero Host fallido/retirada timeout: recuperación abierta. Siguiente cierre/retirada fallido conservando20; recuperación incremental3.123, productor/cohort/paradas/relevos ordinarios y cadencia/plataforma pendientes. f-R3 seguridad conserva cierre;A6/A/B/C abiertos,D no iniciado.


Continuación e-R3: [actor residente del REST/WATCH exterior desde20](native-initial-idle-outside-graphics-20261118.md). Roster/actor existentes compatibles antes de cambiar producción:20→21→22→REST21 conservan actor, raíz, geometrías/índices y bancos/datos/versiones; una adquisición/cero disposiciones de bancos. Relectura de código Three r180 AnimationMixer conserva identidad/vida activa, sin mixer/caché/dependencia nuevos. Pasan36 nuevas (16 cadenas normal/pthread/cuatro perfiles/REST/WATCH, negativos, retiming, color/sombra y picking),141 dirigidas/5 archivos;478/64/16 exactos,476 inputs previos idénticos. GLB/terreno/nativo/TSL reales; renderer/admisión/reloj dobles. Regresión3392/3393 y build46,32 s anteriores solo heredados; sin GPU nueva ni IDs físicos de asignación. Siguiente Surface/puertos/Host/GPU del20 exterior; productor/cohort/paradas/relevos ordinarios, cierre fallido, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [control del REST/WATCH exterior desde20](native-initial-idle-outside-control-20261118.md). Control existente compatible antes de cambiar producción: padre20/21 realmente instalado, evento/reloj/adquisición ordenados, retiming y cortes Home/Task conservados. Investigación de código Jolt5.3 TryGetBody/BodyLock comprueba identidad/adquisición antes del acceso; sin mecanismo ni dependencia nuevos. Pasan31 nuevas (16 cadenas normal/pthread/cuatro perfiles/REST/WATCH) y144 dirigidas/7 archivos;476/64/16 exactos,474 inputs previos idénticos. Regresión3392/3393 y build46,32 s anteriores solo heredados, no repetidos para esta entrega de pruebas/documentación; sin GPU nueva. Siguiente roster/actor/Surface/GPU del20 exterior; productor/cohort/paradas/relevos ordinarios, cierre fallido, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [puente tipado y Game del REST/WATCH exterior desde20](native-initial-idle-outside-game-20261118.md). Entrada explícita/capacidad y DTO2 conservan origen20, fase/RNG/horizonte reales; proyección Game existente sin dueño/dependencia ni cambios nativos. Investigación en código GLTFLoader r180 discrimina versión antes de interpretación, aquí con campos/procedencia estrictos. Pasan30 nuevas (16 cadenas normal/pthread/cuatro perfiles más fronteras/negativos),847 dirigidas/47 archivos,3392/3393 seleccionadas/283/una omisión/siete exclusiones históricas, build 46.32 s;474/64/16 exactos, nativo y worker ajeno intactos. Baseline29 fallos/1 pase; primeros cuatro supuestos incorrectos de fixture corregidos y retenidos. Carga fría WALK request2 y REST21 de llegada reales; WASM anterior rechaza capacidad sin adquisición. Sin GPU nueva ni permiso gráfico de este origen. Siguiente control, luego roster/actor/Surface/GPU; productor/cohort/paradas/relevos ordinarios, cierre fallido, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [fuente nativa de REST/WATCH exterior desde20](native-initial-idle-outside-source-20261118.md). Opt-in explícito initial_retry sobre21 existente conserva el20 adquirido y horizonte de reintento; entrada antigua mantiene -2 exterior/header1 interior. Kernel de prioridad/RNG/decisión/ruta reutilizado, siguiendo separación agente/solicitud de DetourCrowd leída en código; sin dueño/caché/mixer/dependencia nuevos. Pasan29 nuevas (27 fuente/2 mínimo real),817 dirigidas/45 archivos,3362/3363 seleccionadas/281/una omisión/siete exclusiones históricas, build 53.86 s;471/64/16 exactos, dos fuentes/script y tres salidas compiladas normal/pthread, worker ajeno intacto. El Host incorpora la frontera real adquirida al mínimo existente después de retiming; validador de fase y techo causal conservados. Fallo GPU y reproducción con WASM anterior retenidos; inicio programado contrastado en Three AnimationAction. Dieciséis cadenas ABI guardado→autoridad nueva→20→21→22→REST21, sin permiso gráfico nuevo. GPU SOLO regresiones existentes:100/68/98/68 y100/98 preparados/cero tardíos/drain, máximos ventana 148.845/160.480 ms, huecos>50 3/3. Siguiente DTO/puente y Game del20 exterior, luego control/roster/actor/Surface/GPU; productor/cohort/paradas/relevos ordinarios, cierre fallido, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [carga fría GPU de aproximación seleccionada](native-idle-selected-approach-restoration-surface-20261118.md). Sin producción ni binarios nuevos: checkpoint21 fallido/reintento→22 seleccionado real, guardado público y nueva autoridad/request2 con WALK remaining/RNG propios, sin bindings heredados. Se aplica la separación semántica/corredor de DetourCrowd ya investigada; no mecanismo ni dependencia nuevos. Pasan ocho nuevas normal/pthread/cuatro perfiles, 788 dirigidas/43 archivos, 3333/3334 seleccionadas/279/una omisión/siete exclusiones históricas, build 49.00 s; 468/64/16 exactos. NVIDIA timing/visual request2→22→REST21:100/98 preparados/cero tardíos/actor/geometrías/bancos/picking/drain conservados. Máximos ventana 268.130/246.095 ms, huecos>50 3/3; cadencia abierta. Negativo sin plantilla rechaza22/cuerpo retenido, Host fallido y retirada timeout; no recuperación aceptada. Siguiente: REST/WATCH exterior guardado desde20 genuino y productor/cohort/paradas/relevos ordinarios; cierre fallido, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [aproximación seleccionada con remaining en control/actor/Surface](native-idle-selected-approach-graphics-20261118.md). Control existente compatible (20 nuevas antes de producción); roster/Surface contrastan remaining y destino exactos, con selectores semánticos compartidos. Patrón de identidad/vida de bindings de Three r180 AnimationMixer, sin mixer/caché/dueño/dependencia nuevos. Pasan 60 nuevas, 780 dirigidas/42 archivos, 3325/3326 seleccionadas/278/una omisión/siete exclusiones históricas, build 47.31 s; 466/64/16 hashes exactos, nativo intacto. Dieciséis cadenas de componente cubren selección21 y carga fría explícita. GPU timing/visual seleccionada: dos21 reales 100/68, 22 98 y REST21 68 preparados, cero tardíos, actor/geometrías/bancos/picking/drain conservados. Máximos ventana completa 134.295/177.480 ms, huecos>50 4/17; no aceptación de cadencia. Negativo sin plantilla WALK rechaza22/cuerpo retenido, pero Host falla/quiescencia rechazada/retirada timeout: recuperación abierta. Siguiente: carga fría explícita versión2 en Surface/GPU; REST/WATCH exterior guardado, productor/cohort/paradas ordinarios, recuperación incremental3.123 y cadencia/plataforma pendientes. A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [Game y restauración de aproximaciones con remaining real](native-idle-selected-approach-game-20261118.md). Proyección inicial/móvil, guardado público y solicitud fría versión 2 conservan tiempo WALK/RNG/ancla reales y exigen cuerpo/admisión nuevos, sin recrear 20/21/23 ni permisos. Mismo request nativo con escalar opcional; getter de lote ampliado 30 comparte registro/vector y el antiguo de 29 rechaza truncar filas nuevas. Restauración, retiming y cancelWalk al llegar/fallar usan dueños existentes; Home conserva parada preparada. Investigación de código DetourCrowd addAgent/requestMoveTarget separa alta/corredor/solicitud, sin dependencia nueva. Pasan 22 nuevas, 720 dirigidas en 40 archivos, 3265/3266 seleccionadas en 276/una omisión/siete exclusiones históricas, build 49.24 s; 461/64/16 hashes exactos y siete archivos nativos cambiados por compilación normal/pthread. Ocho cadenas Game/save/autoridad nueva y dos registros cero; GPU solo regresiones HEREDADAS, 100/98 y 102/70/98 preparados/cero tardíos/drain, máximos ventana 178.155/140.470 ms, huecos>50 3/3. Control/roster/actor/Surface/GPU del marcador 2 siguen pendientes. También REST/WATCH exterior guardado, productor/cohort/paradas ordinarios, recuperación incremental 3.123 y cadencia/plataforma; A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [descriptor y puente de aproximación seleccionada](native-idle-selected-approach-bridge-20261118.md). Referencia 22 versión 2 transporta WALK remaining real y contrasta variante/RNG/retry/destino con el next nativo del 21 terminado. El puente selecciona la entrada nativa explícita y discrimina longitudes 20/21, 72/73 y 47/48 para propuesta/binding/fuente retenida, sin C++ ni binarios nuevos. Investigación de código Three r180 GLTFLoader: versión antes de interpretar datos; aquí capacidad y campos estrictos. Pasan 16 nuevas, 566 dirigidas en 29 archivos, 3243/3244 seleccionadas en 275/una omisión/siete exclusiones históricas, build 45.86 s; 457/64/16 hashes exactos. Ocho cadenas tipadas normal/pthread mantienen remaining/RNG reales; fixture ABI no demuestra proyección Game ni permiso gráfico. Siguiente: proyección/guardado y declaración nativa con remaining real, luego control/roster/actor/Surface/GPU. REST/WATCH exterior guardado, productor/cohort, recuperación incremental 3.123 y cadencia/plataforma pendientes; A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [fuente nativa de aproximación seleccionada](native-idle-selected-approach-source-20261118.md). Nuevo opt-in explícito sobre el 22 existente toma solo el 21 terminado y su decisión nativa; semantic2 agrega WALK remaining en [20], conserva RNG/destino, draft/ruta/reservas/reloj y longitud heredada 72/47. La entrada antigua conserva -8; DTO/puente/Game/control/roster/Surface siguen pendientes y no se habilita el producto. Investigación DetourCrowd 1.6.0 separa solicitud/camino; se mantiene idle.js: remaining durante WALK, sorteo REST original al llegar. Pasan 20 nuevas, 550 dirigidas en 28 archivos, 3227/3228 seleccionadas en 274/una omisión/siete exclusiones históricas, build 49,84 s; 456/64/16 hashes exactos, seis archivos nativos cambiados por compilación canónica normal/pthread, worker ajeno intacto. GPU solo regresiones HEREDADAS 22→21 y 23→22→21, 100/98 y 102/70/98 recursos preparados/cero tardíos/drain: máximos ventana 56.320/159.355 ms, huecos>50 1/4; no acreditan nuevo marcador 2 ni cadencia. Siguiente: DTO/puente y proyección/guardado del WALK real, luego control/actor/Surface/GPU. REST/WATCH exterior guardado, productor/cohort, recuperación 3.123 y plataforma pendientes; A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [filtro de familias de reloj](native-idle-clock-family-filter-20261118.md). Captura instrumentada localizó 30.976 excepciones por referencias Idle ausentes entre 51.717 comparaciones. Se adapta selección por familia de Three r180 a los tres predicados existentes: relojes sin la referencia Idle/Stroll/Farm no llegan al comparador correspondiente; los presentes conservan validación exacta/restricción resourceEnd y permiso físico. Captura final: cero ausencias/excepciones; control caliente muestreado 274.259→224.287 ms ponderados y mensaje máximo 18.756→17.825 ms CPU (sesiones separadas, no aceptación). Pasan 15 nuevas, 393 dirigidas, 3207/3208 seleccionadas en 273 archivos, una omisión/siete exclusiones históricas, build45,57 s ; 454/64/16 hashes exactos. Timing/visual NVIDIA: 15 ciclos/13 sucesores cero creación/destrucción; fase/picking/drain, negativo caliente y regresiones válida 22→21/Farm23→22→21 pasan. Ventanas máximas 48.395/50.440ms y 0/1 huecos>50; global 64.725/73.160ms y 3/4. Siguiente: contrato existente 22 para aproximación seleccionada con remaining (aún -8); revisión DetourCrowd separa solicitud/camino sin cambiar autoridad. Cadencia/plataforma, REST/WATCH exterior guardado, productor/cohort y recuperación 3.123 abiertos; A6/A/B/C abiertos, D no iniciado.


Continuación e-R3: [referencias Idle ya decodificadas](native-idle-reference-canonical-reuse-20261118.md). Muestreo V8 aisló copia/validación repetida en admitClockBindings. Se adapta el recorrido inmutable de Immer y claves débiles por identidad de Three, sin dependencia nueva: solo salidas congeladas del propio decodificador se reutilizan; transporte/objetos ajenos se validan completos y los permisos vivos no se memorizan. Control caliente muestreado 694.821→274.259ms ponderados, mensaje máximo 43.414→18.756ms CPU (sesiones separadas/profiler, no aceptación). Pasan 8 nuevos, 378 dirigidos, 3192/3193 seleccionados en 272 archivos/una omisión/siete exclusiones históricas, build 47,33 s; 453/64/16 hashes exactos. NVIDIA timing/visual: 15 ciclos, 13 sucesores cero recursos creados/destruidos, fase/picking/drain; negativo caliente y regresión válida 22→21 pasan. Máximos sin profiler 67.050/63.360ms, huecos ventana>50 2/4, global 6/7. Siguiente: comprobar referencias ausentes/de otras familias en las comparaciones de relojes y clasificar callbacks/hold restantes; siguen aproximación 22 remaining, REST/WATCH exterior guardado, productor/cohort, recuperación 3.123 y plataforma. A6/A/B/C abiertos; D no iniciado.


Seguimiento de e-R3 tras `174db9d6a`: [traza de cadencia con grafos reutilizados](native-idle-cycle-binding-reuse-20261118.md#seguimiento-de-cadencia-después-de-174db9d6a). Sin cambios de producción/tests/kernel: 452/64/16 hashes exactos. NVIDIA pasa 15 ciclos y cero recursos creados/destruidos en 13 relevos calientes; traza: 1.105 envíos, 29,999Hz de callbacks, dibujo CPU máximo 2,885ms, ventana máximo 137,845ms/20>50/global 24. Relevos calientes muestran huecos 63–81ms, varias guardas mutation-hold y tareas de control 23–36ms CPU; el mayor hueco sin callback se mantiene separado, sin atribuir causa a tiempo de pared GPU. Siguiente inmediato: perfilar dentro de control/adopción del Host antes de diseñar corrección; investigar código consolidado antes de cada mecanismo. Cadencia, A6/A/B/C y gates integrales abiertos; D no iniciado.


Continuación e-R3: [reutilización de grafos/bindings Idle](native-idle-cycle-binding-reuse-20261118.md). Se adapta almacenamiento inactivo de ImGui Vulkan y actualización de uniformes/identidad de Three r180 al slot Idle y fence existentes, sin dependencia ni propietario nuevos. Timing/visual NVIDIA: 15 adquisiciones, 100+68 objetos de calentamiento y cero creaciones/destrucciones en los 13 sucesores;647/648 IDs inmutables iniciales, fase/picking/drain pasan. Negativos frío y caliente rechazan sin nueva adquisición; regresión válida 22→21 pasa. Pasan12 nuevos, 370 dirigidos y 3184/3185 seleccionados en 271 archivos (una omisión opcional/siete exclusiones históricas), build 50,07 s ; 452 inputs / 64 nativos / 16 ajenos exactos, sin rebuild WASM. Cadencia ABIERTA: timing ventana 83,095 ms / 18 >50 / global 22; visual 265,505 ms / 28 >50 / global 31; provisional 137,835 ms / global 21 conservado, sin atribuir causa. Siguiente inmediato: medir huecos frente a preparación/quiescencia/adopción; después aproximación 22 remaining, REST/WATCH exterior guardado, productor/cohort, recuperación incremental integral de 3.123 y plataforma. A6/A/B/C abiertos; D no iniciado.


Continuación e-R3: [WALK fallido y reintentos en Surface/GPU](native-idle-failed-cycle-surface-20261118.md). Timing/visual NVIDIA prueban primer REST21 desde solicitud WALK original y 15 adquisiciones por captura, sin 20/22 ficticios en la autoridad nueva; fixture físico explícito bloquea el destino, conserva posición fuera del ancla. REST→REST/WATCH→WATCH continuos (error máximo 2.57492694e-07 s), picking/actor/compañero/drain; 648 IDs inmutables retenidos, cero tardíos/duplicados. Pendiente nuevo e inmediato: cada sucesor recrea 36 buffers uniformes+16 layouts+16 grupos (68 objetos), aunque WGSL/pipelines/bancos/geometrías se reutilizan; adaptar identidad/updates de Three sin caché paralela. Ventana timing máximo 101.385 ms/17 >50, global 19 >50; visual 95.745 ms/17 >50/global 20, sin aceptación ni causa atribuida. Negativo plantilla 21 rechaza antes de adquirir; regresión válida 22→21 pasa. Sintaxis 4, 449 inputs/64 nativos exactos; producción/WASM sin cambios, validación previa 8a58e68a8 conserva alcance. Pendientes reutilización de enlaces/cadencia, aproximación 22 con remaining, REST/WATCH exterior guardado, productor/cohort, recuperación incremental de 3.123 y plataforma. A6/A/B/C abiertos; D no iniciado.


Continuación e-R3: [fase continua entre programas Idle](native-idle-cycle-phase-continuity-20261118.md). El control conserva un escalar de espera solo desde el predecesor exacto instalado y el mismo clip terminal; al cambiar de fase se reinicia. Host y picking usan el mismo offset/phaseTime enviados, sin prolongar el cuerpo o horizonte nativos. Patrón de tiempo acumulado/wrap del código AnimationAction de Three r180, sin propietario ni dependencia nuevos. Pasan 17 nuevos, 346 dirigidos y 3172/3173 de selección amplia en 270 archivos (una omisión opcional), build 46.30 s; 448 inputs y 64 nativos exactos, sin rebuild WASM. GLB original y puertos/Host reales con GPU simulada: error máximo de fase 7.15255737e-07 s/vértice 1.36571398e-07 m. Hardware solo regresión VÁLIDA 22→21 conserva 647/648 IDs, cero tardíos/duplicados; ventana máxima 63.565 ms/1 >50 y global 6 >50, sin aceptación ni causa atribuida. Pendientes Surface/GPU del fallo y reintentos, aproximación 22 con remaining, REST/WATCH exterior guardado, productor/cohort, recuperación incremental de 3.123 recursos y cadencia/plataforma. A6/A/B/C abiertos; D no iniciado.


Continuación e-R3: [actor residente del REST fallido](native-idle-failed-cycle-graphics-20261118.md). El primer 21 admite el WALK pendiente exacto sin nativeState previo y conserva actor, raíz, geometrías/índices y bancos. Reutiliza la validación del WALK frío y variantes/rollback/retirada existentes, siguiendo la separación de rig/recursos compartidos del código de Three r180; sin dependencia nueva. Pasan 24 nuevos, 194 dirigidos y 3155/3156 de selección amplia en 269 archivos (una omisión opcional), build 47.75 s; 446 inputs y 64 nativos exactos, sin rebuild WASM. GLB/bancos/terreno/TSL/nativo reales, renderer/admisión/relojes de picking simulados; sin nueva captura hardware. Sonda del actor reproduce retroceso cosmético de 0,7 s en REST→REST/WATCH→WATCH tras espera, cuerpo intacto: corregir reloj antes de aceptar continuidad. Pendientes Surface/puertos/Host/GPU del fallo, aproximación 22 con remaining, REST/WATCH exterior guardado, productor/cohort, recuperación incremental de 3.123 recursos y cadencia/plataforma. A6/A/B/C abiertos; D no iniciado.


Continuación e-R3: [control del REST fallido](native-idle-failed-cycle-control-20261118.md). El 21 se prepara desde la solicitud WALK exacta ligada al cuerpo; solo es vigente tras adquisición, control/reloj e instalación. Los sucesores REST/WATCH versión 2 exigen el 21 anterior instalado y el estado nativo exacto. Home/Task cortan el presupuesto y conservan el cuerpo instalado durante la espera. Se reutilizan el control existente y el patrón de identidad/acceso de Jolt 5.3, sin registro ni dependencia nuevos. Pasan 29 casos nuevos, 301 dirigidos y 3131/3132 de la selección amplia en 268 archivos (una omisión opcional); build 48.64 s; 444 inputs y 64 nativos exactos, sin rebuild WASM. Puertos/Host reales con GPU simulada. La regresión GPU hardware cubre solo la ruta VÁLIDA 22→21: conserva 648/649 IDs, cero recursos tardíos o shaders duplicados; ventana máxima 75.145 ms/2 intervalos >50 ms y global 7 >50 ms, sin aceptación de cadencia ni causa atribuida. Pendientes actor/roster/Surface/GPU del fallo y continuidad de clip entre 21 tras espera, aproximación 22 con remaining, REST/WATCH exterior guardado, productor/cohort, recuperación incremental de 3.123 recursos y cadencia/plataforma. A6/A/B/C abiertos; D no iniciado.


Continuacion e-R3: [contrato tipado y Game del REST fallido](native-idle-failed-cycle-game-20261118.md). Consulta nativa version1/fila29 conserva una solicitud original acotada en el binding21, sin historia ni registro nuevo. Fuente fallida estricta y referencia/sucesor2 validan procedencia,horizonte y reintentos; Game cambia WALK a REST solo tras21 real, sin mover cuerpo ni RNG global. Nudo WATCH respeta prioridad del reintento y limite f32. Referencia codigo Godot4.4 on_sync_receive, sin dependencia nueva. Pasan31 nuevos,272 dirigidos y3102/3103 amplia267 archivos (una omision opcional), build48.55s;442 inputs/64 nativos exactos,ocho cambios canonicos. Home y TaskStart local reales; cosecha exterior sin conector queda encolada. GPU solo regresion VALIDA22-21 conserva650/651 IDs,0 tardios/duplicados; ventana max145.320ms/4>50,global7>50,sin aceptacion ni causa atribuida. Pendientes control/roster/Surface/GPU del fallo,aproximacion22 con remaining y restauracion REST/WATCH exterior; productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [fuente REST y horizonte nativos de WALK bloqueado](native-idle-failed-cycle-20261118.md). Entrada explicita/capacidad1 sobre solicitud real ligada al cuerpo, fuente1/encabezado2 sin20/22/23 ficticios; comparte consulta existente, conserva pose y aplica cancelWalk una vez. Fuera del ancla, horizonte finito de reintento; fallos conservan fase/RNG, reparacion selecciona aproximacion sin permiso22, unknown retiene hasta resolver. Prioridad de reintento sobre REST/WATCH coincidentes y muestreo limitado; lectores antiguos rechazan el formato nuevo. Referencia codigo DetourCrowd1.6; sin dependencia/registro nuevos. Pasan26 nuevos,241 dirigidos y3071/3072 amplia266 archivos (una omision opcional), build45.26s;440 inputs/64 nativos exactos,nueve cambios canonicos. GPU solo regresion VALIDA22-21 conserva648/649 IDs y0 tardios/duplicados; ventana max66.945ms/1>50,global3>50,sin aceptacion ni causa atribuida. Pendientes DTO/puente/Game,control/roster/Surface del fallo y aproximacion con remaining; productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [clip terminal Idle21 continuo](native-idle-cycle-phase-20261118.md). Reutiliza offset Farm/Stroll y LoopRepeat/LoopOnce de Three r180: cuerpo/estado/RNG/reloj fisico finitos, clip Alert continua al final; corte anterior Task/Home permanece fijo. Capacidad nativeIdleCycleIdlePhaseVersion1 y reloj fisico emparejado, mismo dato enviado/picking, retarget sin cambiar grafo/bancos. Pasan23 nuevos,160 dirigidos y3045/3046 amplia265 archivos (una omision opcional), build correcto;439 inputs/64 nativos exactos, sin rebuild WASM. Color/sombra reales, negativos capacidad/reloj/plantilla21 y quiescencia pasan. GPU conserva647/648 IDs en timing y648/649 en visual,0 tardios/duplicados; dos offsets avanzan con cuerpo/estado fijos tras horizonte. Ventana timing max124.695ms/4>50, visual51.890ms/1>50; probe anterior258.825ms/7 global>50 retenido. Cadencia NO aceptada, sin causa atribuida. Pendientes horizonte/fuente/relevo21 del fallo, productor/cohort/recuperacion3123/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [reposo deseado de WALK bloqueado](native-idle-stroll-failed-rest-20261118.md). Consulta nativa version1/fila9 contrasta camino y devuelve el cancelWalk original desde copia del RNG; conserva solicitud/cuerpo/Game/RNG y no fabrica22/21/20 ni permiso grafico. Reutiliza scratch de IntentState, consulta/componentes existentes y patron desiredRest; DetourCrowd1.6 separa fallo/busqueda de instalacion. Pasan22 nuevos,178 dirigidos y3022/3023 amplia264 archivos (una omision opcional), build correcto;437 inputs/64 nativos exactos, seis cambios canonicos. Reparacion retira fallo, unknown no ofrece REST y companero avanza sin consumir el stream. GPU de regresion del recorrido VALIDO22-21 conserva648/649 IDs y0 tardios/duplicados; ventana max42.760ms/0>50, global2>50; no prueba admision GPU de este fallo ni acepta cadencia. Pendientes fuente/relevo21 y horizonte/reintento nativos del fallo, productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [resultado nativo del camino Idle](native-idle-stroll-path-outcome-20261118.md). Consulta nativa de componentes ya existente distingue endpoint conocido sin conector/recorrido imposible (-7,blocked), conectividad ausente (-6,unknown) y conflicto de admision (0); no crea permiso ni cambia cuerpo/Game/RNG. Adapta rama original componentsWorld y separacion resultado/corredor de DetourCrowd1.6, sin registro/dependencia nuevos. Diez pruebas nuevas,156 dirigidas y3000/3001 amplia263 archivos (una omision opcional), build correcto;435 inputs/64 nativos exactos, cuatro cambios canonicos. Anterior WASM falla cuatro casos, uno pasa/cinco filtrados. GPU regresion fria22-21 conserva650/651 IDs y0 tardios/duplicados; ventana max49.455ms/0>50, global2>50, sin aceptacion ni causa atribuida. Pendiente transicion nativa de fallo a REST/reintento, productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [aproximacion restaurada en Surface/GPU](native-idle-approach-restoration-surface-20261118.md). Guardado semantico real23-22 se carga en autoridad nueva, sin permisos previos20/21/24; adquiere22 y llega a REST21/WATCH. Timing/visual conservan648 IDs iniciales y649 antes21,100/98 preparados,0 tardios y0 shaders duplicados; sin buffers de geometria nuevos. Llegado de duracion cero, negativo sin plantilla21 y regresion LOCAL pasan; seleccion/adopcion4/drain. Ventana timing674 max41.630ms/0>50, visual687 max50.560ms/1>50; global3>50 en ambas, sin aceptacion ni causa atribuida. Referencia codigo Pipelines/WebGPUBackend Three r180; reutiliza auditorias/puertos/Host. Sintaxis4;434 inputs de auditoria/64 nativos exactos, pruebas/build de ba87ba88a conservan alcance. Pendientes fallo/reintento sin conector, productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [actor de aproximacion restaurada](native-idle-approach-restoration-graphics-20261118.md). Roster conserva actor/raiz/mallas/geometrias/indices y bancos al adquirir22 y REST21; nacimiento y destino ancla se reconocen tambien desde sourceRequest.approach. Rechaza intercambiar tipo local/aproximacion en DTO o Game, incluido dentro del radio. Reutiliza variantes/retarget/rollback/retiro existentes, sin propietario ni dependencia nuevos. Referencias: codigo Mesh.copy/SkeletonUtils.clone Three r180. Pasan24 nuevos,152 dirigidos y2990/2991 amplia262 archivos (una omision opcional), build correcto;433 inputs/64 nativos identicos. Negativos anterior11 fallos esperados y guardia de tipo2. Modelos/bancos/terreno/WASM y TSL color/sombra reales; renderer, admision y reloj de picking simulados, sin GPU nueva. Pendientes Surface/puertos/Host/GPU de esta restauracion, fallo/reintento sin conector, productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [declaracion/restauracion de aproximaciones](native-idle-approach-restoration-20261118.md). Se reutiliza solicitud WALK/cuerpo/22/21; approach:true conserva ancla, nacimiento y RNG sin fuente Farm ni permisos viejos. Lector nativo2/fila29 y entrada explicita sobre registro comun; firma local intacta, radio local no ampliado. Referencias: codigo DetourCrowd1.6/Godot4.4. Pasan47 nuevos,138 dirigidos y2966/2967 amplia261 archivos (una omision opcional), build correcto;431 inputs/64 nativos exactos,7 cambios canonicos. Cuatro perfiles, normal/pthread, fuera/dentro/llegado; Game con ruta valida llega al mismo REST y contrato vencido declara Home. Control conserva tipo, reloj/instalacion tardios y relevo21; instalacion grafica simulada. Inicio fraccionario sin conector: navegacion original tambien rechaza; se conserva cuerpo/destino/RNG, politica nativa de fallo/reintento aun pendiente. GPU solo regresiones Farm-vivo y restauracion LOCAL previas, no aproximacion fria. Regresiones GPU: vivo conserva652 IDs,70/98 preparados y0 tardios; ventana1236 max157.495ms/3>50, global5>50. LOCAL conserva575 IDs,100 preparados/0 tardios; ventana max46.765ms/0>50, global4>50. Sin aceptacion de cadencia ni causa atribuida. Pendientes roster/Surface/GPU de esta restauracion, sin camino/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm23-aproximacion22-REST21 en Surface/GPU](native-farm-idle-approach-surface-20261118.md). Sonda reutiliza actor, Surface, puertos y Host originales; ancla viva exterior anterior a autoridad, sin20/24 ficticios ni Game anticipado. Timing/visual conserva650 IDs inmutables,70/98 preparados y0 tardios, una textura de movimiento sustituida/retirada y0 shaders duplicados; seleccion, continuidad Idle, adopcion8/drain pasan. Bloqueos54/54 y vigilancia150 dibujos. Negativo sin plantilla21 rechaza y conserva22/cuerpo; regresion estacionaria23-21 pasa. Sintaxis5 modulos,427 inputs/64 nativos exactos;2919/2920 amplia y build48.20s de b8faa3593 mantienen su alcance. Timing ventana1238 max46.620ms/0>50 y global153.720ms/4>50; visual214.085ms/3>50/global6: cadencia global NO aceptada, sin causa atribuida. Referencias de codigo Godot4.4/Three r180 en correcciones previas. Pendientes restauracion/reintentos/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Idle continuo al terminar Stroll22](native-idle-stroll-idle-phase-20261118.md). La sonda real demuestra reloj fisico fijo e Idle congelado durante1.8s al llegar al ancla. Se adapta el offset Farm existente a Stroll con capacidad explicita, decoder fisico certificado, mismo reloj enviado/picking y cota finita; sin temporizador, trayectoria, dependencia ni recurso nuevo. Referencia: AnimationAction._updateTime Three r180. Pasan18 nuevos/108 dirigidos/2919 de2920 amplia258 archivos (una omision opcional), build correcto;427 inputs/64 nativos identicos. Negativo anterior16 fallos esperados. GPU timing/visual completa23-22-21 conserva650 IDs,70/98 preparados y0 tardios,0 shaders duplicados, fases/seleccion/adopcion8/drain; timing ventana1238 max46.620ms/0>50, global153.720ms/4>50; visual ventana214.085ms/3>50/global6, sin atribucion. Sonda Surface aun en incremento separado. Cadencia global, restauracion/reintentos/productor/cohort/recuperacion3123/plataforma pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [transporte vivo de aproximacion Idle](native-farm-idle-approach-live-state-20261118.md). Surface detecta que el validador frio impedia publicar la aproximacion22 ya adquirida. livePhysics reutiliza el validador vivo existente solo para native-idle-stroll; pendiente/frio conserva sus restricciones. Sin dependencia, ABI, nuevo permiso ni restauracion fingida. Referencia: codigo on_sync_receive/on_spawn_receive de Godot4.4. Pasan7 nuevos y2901/2902 amplia257 archivos (una omision opcional), build correcto;424 inputs/64 nativos identicos. Se conservan fallos iniciales y16 archivos ajenos. La sonda Surface ya adquiere22 con ancla exterior, pero continuidad de fases/GPU completa aun pendiente; ancla inicial del ensayo coincidia con el edificio y se corrige en trabajo separado. Restauracion/reintentos/productor/cohort/recuperacion3123/cadencia/plataforma pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [actor Farm a aproximacion Idle22](native-farm-idle-approach-graphics-20261118.md). Reutiliza fila terminal23/politica y actor/raiz/mallas/geometrias/indices/bancos, incluidos clips no usados; sin20/21/24 ficticios ni Game anticipado. Preparacion/rollback/retarget/retiro diferido existentes; solo sustituye datos de movimiento. Llegada real de aproximacion reconoce descanso conservado y destino ancla para REST21, sin ampliar paseo local. Referencias: codigo Mesh.copy/SkeletonUtils.clone Three r180. Pasan33 nuevos,172 dirigidos y2894/2895 amplia256 archivos (una omision opcional), build1m 30s;423 inputs/64 nativos identicos. Tres negativos fallan como esperado; TSL color/sombra y picking con dobles de renderer/admision/reloj, sin GPU nueva. Pendientes Surface/puertos/Host/GPU y continuidad de fases, restauracion/reintentos/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [control de aproximacion Idle desde Farm23](native-farm-idle-approach-control-20261118.md). Reutiliza prueba/registro Farm y leases22, sourceFarm acotado con cuerpo/asignacion/final REAL; preparacion solo sobre Farm instalada, sin20/21/24 ficticios ni evaluacion JS. RouteReplaced1 exacto cierra Farm con cota fisica;22 requiere asociacion preparada/real instalada y watermark. Hechos/relojes del companero y relevo conservan orden; sin saltar relojes. REST21 y parada/Home desde22 admitido pasan. Referencias: codigo Id<T>/LifetimeTracker wgpu26. Pasan20 nuevos,83 dirigidos y2861/2862 amplia255 archivos (una omision opcional), build1m 41s;421 inputs/64 nativos identicos. Cinco negativos fallan como esperado. Instalaciones graficas simuladas, sin GPU nueva; faltan actor/roster/Surface/puertos/Host/GPU aproximacion, restauracion/reintentos/productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [fuente de aproximacion Idle desde Farm23](native-farm-idle-approach-source-20261118.md). Reutiliza22/slot/reservas/fases/revalidacion, sourceFarm acotado y final REAL; sin20/21/24 ficticios, sin correr ni RNG al preparar. Destino ancla fuera del radio, paseo aleatorio conserva restriccion local; Game solo despues22, descanso/reintento originales y llegada REST21. Parada/Home retienen fuente; lector frio local rechaza aproximacion incluso dentro del radio, restauracion/reintentos sin camino pendientes. Referencia: codigo DetourCrowd1.6. Pasan29 nuevos,93 dirigidos,2841/2842 amplia254 archivos (una omision opcional), build1m 30s;419 inputs/64 nativos,6 cambios canonicos. Cuatro negativos y journal RouteReplaced1 exacto. GPU de regresion ANTERIOR23-21 conserva650 IDs,98 preparados/0 tardios, seleccion/adopcion5/drain; ventana max33.900ms/0>50, global142.025ms/8>50, sin aceptacion. Pendientes control/actor/Surface/GPU aproximacion, restauracion/reintentos/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm23 terminada a Idle21 en Surface/GPU](native-farm-arrived-idle-cycle-surface-20261118.md). Reutiliza actor/puertos/Host/plantilla21/retirada diferida, sin20/24 ficticios ni cambios de producto. Referencias: codigo LifetimeTracker wgpu26 y Mesh.copy Three r180. GPU NVIDIA visual/timing conserva650 IDs inmutables;98 preparados,0 tardios; una textura nueva compatible con Alert,12 shaders nuevos/8 pipelines,0 fuentes duplicadas. Retira solo textura Farm; reposo/vigilancia con preparador bloqueado54/150 dibujos, picking/adopcion5/drain pasan. Ventana completa408 frames max38.420/38.015ms,0>50; global124.765/102.640ms con8/3>50: cadencia global NO aceptada; Home264/147ms sigue abierto. Negativo plantilla21 rechaza antes de adquisicion; primer fallo de sonda retenido/corregido. Sintaxis4 modulos,417 inputs/64 nativos exactos; regresion2812/2813 y build1m47s de17cf340a0 mantienen su alcance. Pendientes aproximacion Idle/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [actor Farm23 terminada a Idle21](native-farm-arrived-idle-cycle-graphics-20261118.md). Roster reconoce asociacion instalada23, ultima fila nativa y politica original; conserva actor/raiz/mallas/geometrias/indices y todos los bancos, incluidos Walk/Run no usados. Reutiliza programa Idle/Alert y retirada diferida; retira textura Farm sin otra trayectoria para21 estacionario. Sin20/24 ficticios ni proyeccion Game anticipada. Referencias: codigo Mesh.copy/SkeletonUtils.clone Three r180. Pasan33 nuevos,128 dirigidos y2812/2813 amplia253 archivos (una omision opcional), build1m47s;416 inputs/64 nativos identicos. Tres negativos fallan como esperado. Renderer/admision/reloj de picking simulados, sin GPU nueva; pendientes Surface/puertos/Host/GPU Idle, aproximacion/productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [control Farm23 terminada a Idle21](native-farm-arrived-idle-cycle-control-20261118.md). Reutiliza registro/prueba Farm y leases21, mismo cuerpo/epoca/asignacion/final REAL, sin20/24 ficticios ni evaluacion JS de fases. RouteCompleted7 cierra Farm con cota finita;21 requiere asociacion instalada y watermark. Cancelacion nativa5 exacta cierra permiso en movimiento o cero distancia sin otro propietario; dos expectativas antiguas actualizadas con retiro nativo real. Referencias: codigo Id<T>/LifetimeTracker wgpu26. Pasan25 nuevos,136 dirigidos y2779/2780 amplia252 archivos (una omision opcional), build1m35s;414 inputs/64 nativos identicos. Cuatro negativos fallan como esperado. Instalaciones graficas simuladas, sin GPU nueva; sonda del roster conserva una adquisicion pero rechaza origen Farm pendiente. Faltan actor/fase/puertos/Surface/GPU Idle, aproximacion/productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [fuente Farm23 terminada a Idle21](native-farm-arrived-idle-cycle-source-20261118.md). Reutiliza provisional21 y cuerpo/asociacion23 real, sin20/24 ficticios; nacimiento original createIdleState, journal unico RouteCompleted7 y Game despues21. Referencias: codigo DetourCrowd1.6/Godot4.3. Pasan36 nuevos,146 dirigidos y2754/2755 amplia251 archivos (una omision opcional), build1m56s;412 inputs/64 nativos,7 cambios tras build canonico. GPU de regresion del relevo ANTERIOR23-Home conserva646 IDs,70 preparados/0 tardios,0 shaders/pipelines,54/54 dibujos/bloqueo y drain; ventana max33.475ms/0>50, global86.635ms/2>50, sin aceptacion global. Sonda confirma controlador rechaza nueva ascendencia23 antes de preparar Idle; faltan control/actor/puertos/Surface/GPU, aproximacion Idle fuera de ancla, productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm23 terminada a Home19/18 en Surface/GPU](native-farm-arrived-home-surface-20261118.md). Ensayo original/puertos/Host, API contrato real, sin24/Idle ficticios; reusa gates de terreno y camara inicial noreste, sin cambios de mecanismos de producto. GPU visual/timing/traza conserva646/644/644 IDs, sustituye solo una textura de movimiento,70 preparados/0 tardios y0 shaders/pipelines; picking/adopcion5/drain y control negativo de plantilla pasan. Ventana completa max33.555/264.465/35.025ms: timing tiene2 tirones, bloques54/44 frente54/54 visual/traza; CADENCIA NO ACEPTADA, causa sin atribuir. Global127.610/264.465/215.700ms con5/4/6>50.410 inputs/64 nativos exactos; sintaxis4 modulos; regresion/build de producto anterior8c2f23128 conservan su alcance, sin repetirlos por cambios de ensayo. Pendientes finalIdle/productor/cohort/recuperacion3123/cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [actor Farm23 terminada a Home19/18](native-farm-arrived-home-graphics-20261118.md). Roster reconoce ultima fila nativa23, asociacion instalada y politica original; conserva actor/raiz/mallas/geometrias/indices/bancos, prepara solo variante/movimiento Home y retira diferido. Distingue epoca preparada de final REAL tras Farm tardia, sin24/Idle ficticios. Referencias: codigo Mesh.copy/SkeletonUtils.clone Three r180. Pasan38 nuevos,95 dirigidos y2718/2719 amplia250 archivos (una omision opcional), build1m35s;410 inputs y64 nativos identicos. Renderer/admision/frame simulados, sin GPU nueva. Siguientes Surface/puertos/Host/GPU Home, finalIdle, productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [control Farm23 terminada a Home19/18](native-farm-arrived-home-control-20261118.md). Reutiliza registro revocado/prueba instalada y retencion Task, extremo REAL finito, mismo cuerpo/request completo incluso bootstrap, sin24/Idle ficticios. Referencias: codigo Id<T>/LifetimeTracker wgpu26. Pasan23 nuevos,56 dirigidos y2680/2681 amplia249 archivos (una omision opcional), build1m39s;408 inputs y64 nativos identicos, sin rebuild WASM. Instalaciones graficas simuladas; no hay GPU nueva. Sonda del consumidor conserva una adquisicion del modelo y obtiene18, pero falta reconocer la ascendencia Farm en roster. Pendientes actor/puertos/Surface/GPU Home, finalIdle, productor/cohort/recuperacion3123 y cadencia/plataforma. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [fuente Farm23 terminada a Home19/18](native-farm-arrived-home-source-20261118.md). Reutiliza request/pose/cuerpo Home, extremo nativo atestiguado y revocacion23 unica, sin24/Idle ficticios. Referencias: codigo DetourCrowd1.6/Godot4.4. Pasan24 nuevos,63 dirigidos y2657/2658 amplia248 archivos (una omision opcional), build1m44s;406 inputs y64 nativos/4 cambios tras rebuild canonico standalone/pthread. API Game admite contrato terminado y ticks despues19; Farm activa antes19/productor/cohort siguen pendientes. GPU de regresion del relevo ANTERIOR23-Task conserva645 IDs,70 preparados/0 tardios,0 shaders/pipelines,54 dibujos/bloqueo y drain; timing global66.64ms con2>50, no prueba nuevoHome ni cero tirones. Sonda confirma controlador anterior rechaza evento Home terminal; faltan control/puertos/actor/Surface/GPU, finalIdle y recuperacion3123. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Idle terminal y Farm23 terminada a Task14 en consumidor original](native-farm-idle-phase-20261118.md). Reutiliza uniforme Idle, actor/bancos y shader; cota fisica finita y lease tipada permiten quiescencia Task6 sin24/Idle ficticios. Referencias: codigo AnimationMixer/AnimationAction Three r180 y LifetimeTracker/Id wgpu26. GPU visual y timing conservan646 IDs, sustituyen solo textura de movimiento,70 preparados/0 tardios y0 shaders/pipelines,54 dibujos por bloqueo1800ms, picking/adopcion5/drain reales. Ventana completa de relevo max38.03/35.78ms sin>50; global219.36/93.50ms con7/2 huecos>50, sin atribucion ni garantia global. Home24 regresion conserva640 IDs/0 tardios. Pasan16 nuevos y2633/2634 amplia247 archivos (una omision opcional), build1m36s;404 inputs y64 nativos identicos. A6/A/B/C abiertos,D no iniciado; siguen finalesHome/Idle, productor/cohort/recuperacion3123 y cadencia/plataforma.


Continuacion e-R3: [actor Farm23 terminada a Task14](native-farm-arrived-task-graphics-20261118.md). Roster acepta ultima fila nativa23 instalada, mismo cuerpo/pose/fases/politica, sin24/Idle ficticios; conserva raiz/mallas/geometrias/indices/bancos y sustituye solo movimiento. Referencias: codigo Mesh.copy/SkeletonUtils.clone de Three r180. Pasan36 casos nuevos y2617/2618 amplia246 archivos (una omision opcional), build1m46s;402 inputs y64 nativos identicos. Renderer/admision/frame simulados; falta reloj Idle terminal y cadena Surface/Host/GPU. Diagnostico confirma fase Idle congelada tras final fisico; AnimationMixer/AnimationAction son referencia del siguiente mecanismo. A6/A/B/C abiertos,D no iniciado; finalesHome/Idle/productor/cohort/recuperacion3123 y cadencia/plataforma pendientes.


Continuacion e-R3: [control Farm23 terminada a Task6/14](native-farm-arrived-task-control-20261118.md). Reutiliza registro revocado y prueba23 instalada, cota en final REAL aun con origen preparado anterior; mismo cuerpo hasta14, sin24/Idle ficticio. Log nativo sin residencia no obtiene permiso antiguo;14 rechaza cuerpo distinto antes de preparar/instalar. Referencias: codigo Id<T>/LifetimeTracker wgpu26. Pasan296 dirigidas,2580/2581 amplia244 archivos (una omision opcional) y1 suplementaria tardia separada, build;400 inputs finales y64 nativos identicos. Sin GPU nueva: faltan actor/roster/puertos/Surface del relevo terminal, finalesHome/Idle/productor/cohort/recuperacion3123. A6/A/B/C abiertos,D no iniciado; continuidad/plataforma conservan evidencia separada.


Continuacion e-R3: [fuente Farm23 terminada a Task6/14](native-farm-arrived-task-source-20261118.md). Preflight exige final fisico atestiguado y solicitud pendiente; reutiliza portador de pose/cuerpo, sin24/Idle ficticios. Revoca handle23 exacto en el mismo evento6 y solo14 adquiere movimiento. Referencias: codigo Godot4.4/DetourCrowd1.6. Pasan228 dirigidas,2560/2561 regresion243 archivos (una omision opcional) y build;397 inputs congelados,64 nativos/3 cambios tras rebuild standalone/pthread. Regresion GPU del relevo ANTERIOR24-Task conserva646 IDs,70 preparados/0 tardios,54 dibujos y drain; no acredita consumidor23-final. Faltan control/consumidor terminal23, finales Idle/Home, productor/cohort/recuperacion3123. A6/A/B/C abiertos,D no iniciado; continuidad/plataforma siguen evidencia de cadencia.


Continuacion A6/C3: [presentacion pendiente al liberar barrera](native-mutation-release-presentation-20261118.md). El Host termina la RAF perdida al recibir release validado, misma cadena y todos los guards/fences. Referencia: codigo DisplayScheduler de Chromium140 y LifetimeTracker wgpu26. GPU Home con demoras30/50/100ms conserva639/640/640 IDs,70 preparados/0 tardios; traza sitúa dibujo8.47ms antes de siguiente RAF. Task normal646 IDs/0 tardios. Holds largos y maximos113.44/128.13ms permanecen observables, sin atribucion ni garantia cero tirones. Display observado30Hz explica base33.3ms. Pasan309 dirigidas y build; regresion agregada2531/2532 con una omision,12 casos recuperados con WASM explicito. A6/A/B/C abiertos,D no iniciado; siguen finales/cohort/productor/recuperacion3123.


Continuacion e-R3: [Farm retenido a Home en consumidor original](e-r3-native-farm-moving-home-consumer-20261118.md). Control/admision/puertos/actor/Surface/Host conservan cuerpo hasta18, sin Idle ficticio. NVIDIA/Turing conserva642 IDs inmutables, retira solo tabla Farm, prepara70 recursos y crea0 despues de READY;0 shaders/pipelines nuevos, ACK18/picking/adopcion5/drain reales. Regresiones GPU Farm-Task646 IDs e Idle-Home678,0 tardios. Home127 muestras/max61.22ms; captura764/max92.54ms. RAF intermedia sin draw dentro del intercambio y guard de barrera global: continuidad de quiescencia queda pendiente A6, sin retirar seguridad del fence. Pasan2524 pruebas/238 archivos (una omision opcional),157 dirigidas y build;64 inputs nativos sin cambios. Faltan continuidad/finales/cohort/productor/recuperacion3123. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [fuente Farm retenido a Home y Game](e-r3-native-farm-moving-home-source-20261117.md). Nucleo Home detenido compartido con entrada Farm explicita: misma pose/cuerpo/slot hasta adquirir18, sin Idle ficticio ni nueva tarea. Game solicita Home al vencer contrato/hora250/300; Task independiente avanza. Solo lectura retenida admite contrato vencido, declaraciones Farm nuevas siguen cerradas. Referencias: codigo DetourCrowd1.6.0/Godot4.4-stable. Pasan2480 pruebas/235 archivos (una omision opcional),155 dirigidas y build; ambos WASM y modulo pthread recompilados,64 inputs nativos/7 cambios. Falta control/admision/puertos/actor/Surface/GPU Farm-Home y finales/cohort/productor. GPU anterior cbf31c436 no acredita nuevos binarios; intervalos y recuperacion3123 abiertos. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm retenido a Task en Surface/GPU](e-r3-native-farm-moving-task-surface-20261117.md). Mismo actor/Surface/Workers/puertos/Host; Task genuina encolada al llegar, parada24, solicitud6 y adquisicion14. NVIDIA/Turing conserva646 IDs inmutables, retira solo tabla Farm, prepara70 recursos y crea0 despues de READY;0 shaders/pipelines nuevos,54 dibujos por bloqueo y ACK14/picking/adopcion5/drain reales. Idle retenido a Task conserva683 IDs/0 tardios. Relevo129 muestras/max34.89ms; captura global785/max139.89ms y5 huecos>50ms en montaje inicial, sin atribucion causal ni garantia sin tirones. Pasan2461 pruebas/234 archivos (una omision opcional),133 dirigidas y build;64 inputs nativos sin cambios. Faltan Home/finales/cohort/productor/recuperacion3123. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [actor original Farm retenido a Task](e-r3-native-farm-moving-task-graphics-20261117.md). Roster comparte continuacion12/24 sin Idle ficticio: pose/politica exactas, activacion/rollback y adquisicion14 sobre misma raiz/geometrias/indices/bancos. Nueva tabla solo para trayectoria Task; propietario retenido se retira al adquirir. Referencias: codigo Mesh.copy/SkeletonUtils.clone de Three r180. Pasan2461 pruebas/234 archivos (una omision opcional),133 dirigidas y build;64 inputs nativos sin cambios. Renderer/admision/frame simulado; faltan Surface/Host/hardware del relevo, Home/finales/cohort/productor. Intervalos y recuperacion3123 abiertos. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [control y admision Farm retenido a Task](e-r3-native-farm-moving-task-control-20261117.md). Lease tipada conserva cuerpo/pose mientras solicitud6 espera; version/familia/generacion/proyeccion exactas, sin ascenso de prueba incompleta ni Home ficticio. ACK14 propio con plantilla/version1 en Host/publicador y comprobacion independiente de admision. Referencias: codigo Id<T>/Queue/LifetimeTracker de wgpu26.0.1. Pasan2440 pruebas/233 archivos (una omision opcional),100 dirigidas y build;64 inputs nativos sin cambios. Puertos reales, paquete/drain GPU simulados; faltan actor/Surface/hardware del relevo, Home/finales/cohort/productor. Intervalos y recuperacion3123 abiertos. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm retenido a solicitud Task/TaskStart nativos](e-r3-native-farm-moving-task-source-20261117.md). Captura compartida conserva cuerpo/fases/presupuesto, solo publica solicitud6 y adquiere movimiento con14. Game reconoce Farm retenido exacto y reclama Task incluso por maduracion dentro del tick, sin Idle ni mover JS; otro Task avanza. Referencias: codigo DetourCrowd1.6.0/Godot4.4-stable. Pasan2412 pruebas/231 archivos (una omision opcional),189 dirigidas y build; ambos WASM recompilados,64 inputs nativos exactos/4 cambios. Fuente/ABI de confianza: faltan control/admision/puertos/actor/Surface del relevo, Home/finales/cohort/productor. Sin hardware nuevo; intervalos y recuperacion3123 abiertos. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm24 en Surface/Workers originales](e-r3-native-farm-arrival-stop-surface-20261117.md). Plantilla/recibo24, snapshot retenido antes del recibo y reconciliacion vacia real; Worker anuncia parada/reloj version1. Referencia: codigo Queue/LifetimeTracker de wgpu26.0.1. GPU NVIDIA conserva641 IDs, prepara68 recursos y crea0 tras READY;54 frames durante bloqueo1800ms,61 tras commit, adopcion/picking/drain reales. Idle12 conserva679 IDs/0 tardios. Persisten intervalos64.27ms tras parada y86.81ms previos de Farm23 en ventanas capturadas: no acredita ausencia de tirones ni recuperacion3123. Pasan2396 pruebas/230 archivos (una omision opcional),105 dirigidas y build;64 inputs nativos exactos. Faltan relevos/finales/cohort/productor. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm24 en actor y roster](e-r3-native-farm-arrival-stop-graphics-20261117.md). Misma raiz/geometrias/indices, una adquisicion del modelo y tabla de movimiento compartida; shaders reales conservan texturas/datos/version. Recibo final24 y pose retenida exacta, Game sigue arriving sin Idle ficticio. Referencia: codigo Mesh.copy/SkeletonUtils.clone de Three r180. Pasan2391 pruebas/230 archivos (una omision opcional),82 dirigidas y build;64 inputs nativos exactos sin recompilar. Renderer/admision/picking presentado simulados; faltan Surface/capacidad Worker24, hardware y relevos Task/Home. Continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [cliente y Host Farm24](e-r3-native-farm-arrival-stop-remote-20261117.md). Paquete retenido exige plantilla24, reloj relativo y todos los valores finales; ACK tras promesa de drain y liberacion instala prueba nativa exacta. Commit local usa copia de metadata, no objetos del caller. Referencia: codigo Queue/LifetimeTracker de wgpu26.0.1. Pasan2374 pruebas/229 archivos (una omision opcional),110 dirigidas y build;64 inputs nativos exactos sin recompilar. Dispositivo/triangulo simulados; faltan Surface/roster/capacidad Worker24 y relevos Task/Home. Continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [reloj y picking Farm detenido](e-r3-native-farm-arrival-stop-clock-20261117.md). Selector12/24 en reloj y kernel TSL existentes; misma textura/datos/version, pose final real despues del giro y picking desde frame presentado. Rechaza tiempos anteriores a parada; cliente no reutiliza capacidad Idle para Farm. Referencia: codigo NodeUtils de Three r180. Pasan2347 pruebas/228 archivos (una omision opcional),64 dirigidas y build;64 inputs nativos exactos sin recompilar. TSL real, frame/backend/GPU simulados; falta Host/Surface/roster24 y relevos Task/Home. Continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm24 en canales de preparacion](e-r3-native-farm-arrival-stop-ports-20261117.md). Terreno conserva plantilla24, efectos propios, reserva de bytes y asociacion final hasta adopcion confirmada; cliente/receptor nativo compartidos y conexion directa mantienen el recibo tipado sin comandos nuevos. Referencia: codigo LifetimeTracker/Id<T> de wgpu26.0.1. Pasan2329 pruebas/227 archivos (una omision opcional),96 dirigidas y build;64 inputs nativos exactos sin recompilar. Canales reales, GPU/drain/frame simulados; falta consumidor24 y relevos Task/Home. Continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [admision y publicacion de control Farm24](e-r3-native-farm-arrival-stop-admission-20261117.md). Fuente comparte transactor12/24 y revalida pose/propietarios; publicador original exige plantilla/ACK/version24 y libera asociacion final nativa con proyeccion. Referencia: codigo Queue/LifetimeTracker de wgpu26.0.1. Pasan2308 pruebas/226 archivos (una omision opcional),91 dirigidas y build;64 inputs nativos exactos sin recompilar. MessagePort real, recursos/drain/frame simulados. Faltan puertos de preparacion/consumidor24 y relevos Task/Home. Sin hardware nuevo; continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [control directo Farm24](e-r3-native-farm-arrival-stop-control-20261117.md). Control original comparte validacion12/24, conserva fuente admitida Farm23 y exige revocacion/reloj/instalacion exactos para leer pose retenida. Referencia: codigo Id<T> de wgpu26.0.1. Pasan2287 pruebas/225 archivos (una omision opcional),69 dirigidas y build;64 inputs nativos exactos sin recompilar. Faltan admision/publicacion/puertos/consumidor24 y relevos Task/Home. Sin hardware nuevo; continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [proyeccion Farm retenido](e-r3-native-farm-arrival-held-projection-20261117.md). Lectura nativa del mismo cuerpo/slot suspendido y generacion exacta; Game conserva arriving, pose/fases/presupuesto, sin Idle ficticio. Guardado semantico restaura una declaracion nueva; tick/productor/guardado UI/baseline siguen cerrados. Referencias: codigo DetourCrowd1.6.0/Godot4.4. Pasan2269 pruebas/224 archivos (una omision opcional),72 dirigidas y build; ambos WASM recompilados,64 inputs nativos exactos. Faltan control/admision/puertos/consumidor24 y relevos Task/Home. Sin hardware nuevo; continuidad y recuperacion3123 pendientes. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [datos y asociacion Farm24](e-r3-native-farm-arrival-stop-data-20261117.md). Esquema/adapter existentes compartidos12/24, etiquetas y generacion exactas; journal nativo de ultima publicacion identifica la fuente elegida, no solo dependencias detenidas. Referencia: codigo Id<T> de wgpu26.0.1. Pasan2250 pruebas/223 archivos (una omision opcional),89 dirigidas y build; standalone/pthread recompilados,64 inputs/artefactos congelados. Faltan proyeccion/control/puertos/consumidor y relevos Game; no hardware24. Siguen pendientes huecos y recuperacion3123. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [parada Farm24 nativa preparada](e-r3-native-farm-arrival-stop-source-20261117.md). Se comparte el nucleo de parada12 con fuente Farm explicita: mismo cuerpo/slot, pose final revalidada y recibo ligado al ticket preparado; Task peer sigue avanzando. Referencias: codigo DetourCrowd1.6.0/Godot4.4. Pasan2232 pruebas/222 archivos (una omision opcional),40 dirigidas y build; standalone/pthread recompilados,64 inputs/artefactos congelados. Faltan datos/proyeccion/control/puertos/consumidor y relevos Game; no hardware24. Siguen pendientes huecos y recuperacion3123. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm23 en Surface/Workers originales](e-r3-native-farm-arrival-route-surface-20261117.md). Se amplia el ciclo retenido y Worker anuncia version1; referencia: codigo wgpu26.0.1. GPU NVIDIA conserva 564/561 IDs en dos runs, prepara102 recursos y crea0 tras READY; ambos puertos, movimiento/picking y drain reales. Siguen huecos:172.74ms globales en primer run;158.18ms globales/61.20ms en bloqueo del run con traza. No acredita ausencia de tirones ni recuperacion3123. Pasan2215 pruebas/221 archivos (una omision opcional) y build,64 inputs nativos exactos. Faltan relevos/cohort/productor y continuidad integral. A6/A/B/C abiertos,D no iniciado.


Continuacion e-R3: [Farm23 en actor y banco originales](e-r3-native-farm-arrival-route-graphics-20261117.md). El roster prepara/adopta/retargetea sobre la misma raiz, geometria e indices con una adquisicion del banco; exige fuente y asociacion23 exactas. Referencia: implementaciones Mesh.copy/SkeletonUtils.clone de Three r180. Pasan 2215 pruebas/221 archivos (una omision opcional), 17 nuevas y build; 64 inputs nativos exactos. GLB/bakes y compilacion TSL reales, renderer/admision simulados; no hardware. Faltan Surface, capacidad Worker, relevos/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [recibo y reloj de llegada en cliente/Host](e-r3-native-farm-arrival-route-remote-20261117.md). Host exige plantilla/frame/reloj relativo exactos, espera drain y solo instala la asociacion emitida; picking conserva edad cero/origen real al adoptar. Referencia: codigo wgpu26.0.1. Pasan 2198 pruebas/220 archivos (una omision opcional), 257 dirigidas y build; 64 inputs nativos exactos, sin recompilar. Transporte/dispositivo de tests simulados; Worker aun no anuncia Farm. Faltan roster/Surface, hardware, relevos/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [terreno, tabla GPU, reloj y picking de llegada](e-r3-native-farm-arrival-route-clock-20261117.md). Farm usa el programa existente; revalidar datos relativos iguales conserva textura/uniforme/buffer/registro sin marcar subida. Referencias: codigo Rapier.js y Three r180. Cero llegada usa un knot; picking distingue edad enviada/origen real. Pasan 2179 pruebas/219 archivos (una omision opcional), 227 dirigidas y build; 64 inputs nativos exactos, sin recompilar ni repetir hardware. Cliente remoto aun cerrado hasta implementar consumidor; no acredita recuperacion integral de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [puertos y contrato de publicacion de llegada](e-r3-native-farm-arrival-route-ports-20261117.md). Las conexiones existentes conservan plantilla23 y validan acuse/liberacion exactos, clases y reservas; una imagen generica del Host no basta. Referencia: codigo wgpu26.0.1. Pasan 2160 pruebas/217 archivos (una omision opcional), 198 dirigidas y build; 64 inputs nativos exactos, sin recompilar ni repetir GPU. Preparador/drain positivos son dobles; Host aun no anuncia Farm. Faltan reloj/picking/consumidor grafico, finales/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [adquisicion preparada de llegada en fuente](e-r3-native-farm-arrival-route-admission-20261117.md). Farm23 reutiliza el transactor y exige version/plantilla/frame exactos antes de adquirir; conserva Task genuino concurrente y reporta fallos posteriores al commit. Referencia: codigo wgpu26.0.1. Pasan 2137 pruebas/216 archivos (una omision opcional), 146 dirigidas y build; 64 inputs nativos exactos, sin recompilar ni repetir GPU. Dobles de paquete/drain no acreditan consumidor grafico. Faltan emision/liberacion/puertos/consumidor, finales/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [asociacion de llegada en control directo](e-r3-native-farm-arrival-route-control-20261117.md). El evento real23 conserva la peticion exacta y el registro existente; replay exige reloj e instalacion, sin admision generica ni bootstrap de otra familia. Publicacion/Host originales transportan el evento; referencia: codigo DetourCrowd1.6.0. Pasan 2119 pruebas/215 archivos (una omision opcional), 128 dirigidas y build; 64 inputs nativos exactos, sin recompilar ni repetir GPU. Faltan recibo/liberacion/puertos/consumidor, finales/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [proyeccion semantica de llegada nativa](e-r3-native-farm-arrival-route-projection-20261117.md). Game refleja la cache fisica real y restaura pose/fases/presupuesto en una declaracion nueva, sin permisos guardados ni Idle ficticio. Referencia: codigo Rapier.js. Conserva asignacion original de Task; tick/productor y guardado UI siguen cerrados hasta el relevo preparado. Pasan 2101 pruebas/214 archivos (una omision opcional), 110 dirigidas y build; 64 inputs nativos exactos, sin recompilar ni repetir GPU. Faltan relevo/recibo/control/puertos/consumidor, finales/cohort y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [referencia tipada del corredor de llegada](e-r3-native-farm-arrival-route-data-20261117.md). El bridge reutiliza captura/revalidacion y datos propios; distingue servicio/extremo y conserva llegada cero, sin permiso nuevo. Referencia: codigo Rapier v0.22.0. Getter acotado evita copiar el corredor o enumerar el cohort en lecturas de ejecucion, sin cache nueva. Pasan 2083 pruebas/213 archivos (una comparacion opcional omitida), 92 dirigidas, ambos WASM y build; no se repite GPU. Faltan Game/control/recibo/puertos/consumidor, finales y cohort de llegada, productor integral y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [corredor nativo preparado de llegada](e-r3-native-farm-arrival-route-source-20261117.md). Familia 23 usa peticion, cuerpo, slot y pruebas fisicas existentes; conserva zona libre de 2 m, urgencia 0/1 y llegada cero con pose/fases exactas. Referencias: codigo DetourCrowd 1.6.0 y Godot 4.4, sin dependencia nueva. Pasan 2062 pruebas/212 archivos (una comparacion opcional omitida), 71 dirigidas, ambos WASM y build. GPU de vertical previa conserva 569 IDs; 30 recursos tardios y maximo global 66.72 ms mantienen C abierto. Faltan referencia/proyeccion/recibo/consumidor, finales y cohort de llegada, productor integral y recuperacion incremental de 3.123. A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [publicacion/control de llegada pendiente](e-r3-native-farm-arrival-control-20261117.md). Baseline/eventos y Host originales validan la fuente vinculada en el slot existente, con identidad y watermark causal; la declaracion sin cuerpo no concede permiso. Rechaza alias, mezclas y revocaciones inventadas; Task genuino conserva el cuerpo. Pasan 1652 pruebas/147 archivos (1 omision opcional), 50 dirigidas y build; 63 inputs nativos exactos, sin recompilar ni repetir GPU. Faltan ruta/recibo/consumidor grafico, finales/Home y productor ordinario de llegada. A6/A/B/C abiertos, D no iniciado; continuidad y recuperacion incremental integral de 3123 pendientes.


Continuacion e-R3: [llegada pendiente tipada y Game](e-r3-native-farm-arrival-game-20261117.md). Referencias propias y getter nativo de objetivo/pose validan la fuente antes de declararla. Game retiene el cuerpo mientras avanza un Task peer y transfiere tareas reales, incluso al madurar un cultivo dentro del tick, a recursos Task14 pendientes; tambien antes del primer cuerpo. Reutiliza la transferencia de pose existente, sin Idle/Home ficticios ni cola nueva. Pasan 2025 pruebas en 210 archivos (una omision opcional), 34 dirigidas, build y regresion GPU; ambos WASM reconstruidos. GPU conserva 569 IDs; 30 recursos nuevos de pisadas y maximo global 95.13 ms mantienen C abierto. Faltan control/publicacion, ruta y recibo grafico de llegada, Home y productor ordinario; A6/A/B/C abiertos, D no iniciado. Continuidad y recuperacion incremental integral de 3123 siguen pendientes.


Continuacion e-R3: [fuente nativa de llegada a granja](e-r3-native-farm-arrival-request-20261117.md). La peticion propia conserva pose, centro y punto de servicio, sin tarea/Home/Idle ficticios ni permiso ejecutable. Adapta la separacion objetivo/tolerancia/ruta del codigo Godot 4.4 sobre los propietarios existentes. Pasan 2004 pruebas en 208 archivos (una comparacion opcional omitida), 13 nuevas y build; ambos modulos se reconstruyen. Faltan referencia tipada, proyeccion Game/control, ruta y recursos graficos, llegada y relevos antes de activar esta clase. A6/A/B/C abiertos, D no iniciado; continuidad y recuperacion incremental integral de 3123 pendientes.


Continuacion e-R3: [productor restaurado en Workers/GPU originales](e-r3-native-intent-production-world-owner-20261117.md). La autoridad consulta el publicador real de terreno y Surface inicializa su soporte sin ruta legacy previa. NVIDIA/Turing conserva 569 IDs residentes, picking y drenaje; 54/53 dibujos durante bloqueos de 1800 ms. Se contabilizan 300 recursos preparados y 30 nuevos de pisadas tras READY: no es cero asignacion de escena. Maximos 119.23 ms en bootstrap y 66.80 ms en adopcion mantienen C abierto. Faltan otros origenes/finales/cohortes/puertas/raid, parada WALK, guardado y recuperacion incremental integral de 3123; A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [productor en cohortes restauradas](e-r3-native-intent-production-restoration-20261117.md). La autoridad vincula cuerpos una vez y despacha propuestas existentes con secuencia de publicacion, cancelacion y una sola preparacion. Referencia: codigo DetourCrowd1.6.0; sin dependencia ni cola nueva. Pasan 648 pruebas/76 archivos y14 nuevas; una comparacion nativa opcional omitida expresamente. GPU de verticales existentes y build pasan;62 inputs nativos sin cambios. Falta validar el productor con roster/Surface/Workers/GPU originales y completar origenes/finales, cohortes/puertas/raid, parada de WALK, guardado y recuperacion incremental de3123. Continuidad85.62/41.01ms y siete fallos previos siguen abiertos; A6/A/B/C abiertos, D no iniciado.


Continuacion e-R3: [parada22 en cohorte Game](e-r3-native-idle-stroll-stop-game-20261117.md). Solo la suspension22 con fuente fisica exacta puede esperar mientras avanza un companero y consumirse en Task/Home genuinos. Referencia: pausa por agente en codigo Godot4.4; sin nueva dependencia. Pasan1868 pruebas/168 archivos,42 dirigidas (16 nuevas), GPU parada->Task/Home y build;62 inputs nativos congelados. Productor ordinario, parada automatica durante WALK, otros finales/puertas, guardado y recuperacion incremental de3123 siguen pendientes. Continuidad historica85.62/41.01ms y siete fallos previos quedan abiertos; A6/A/B/C abiertos, D no iniciado.


Continuacion A4/C: [presupuesto al reanudar recursos](a4-resource-continuation-budget-20261117.md). Las operaciones vuelven al presupuesto existente tras esperar dependencias/submit; la medicion incluye trabajo reanudado y fecha/metodo del maximo. No hay nueva cola ni dependencia. Pasan 1852 pruebas/167 archivos, 171 dirigidas (4 nuevas), GPU con/sin traza y build;62 inputs nativos exactos. El maximo anterior ya precedia la preparacion. El pico historico85.62ms y continuidad integrada siguen abiertos: no se prueba su causa ni ausencia total de tirones. Productor/cohort, otros finales/puertas y recuperacion de3123 pendientes; A6/A/B/C abiertos, D no iniciado.


Continuacion de Idle: [paseo restaurado en consumidor original](e-r3-native-idle-stroll-restoration-consumer-20261117.md). Roster/Surface/puertos/GPU adquieren22 desde la peticion nueva conservando actor y recursos residentes, sin20/21 ficticios; tambien pasa llegada cero. NVIDIA/Turing conserva IDs sin retiros y cero asignaciones tras READY; la primera variante Walk/Idle se prepara y contabiliza antes. Pasan 1848 pruebas/166 archivos, 21 especificas (10 nuevas), tres ejecuciones GPU y build;62 inputs nativos exactos. Falta productor/cohort ordinario, otros finales/puertas, parada durante WALK activo y recuperacion integral de3123. El pico observado de85.62ms en preparacion queda abierto paraC, aunque la repeticion midio34.47ms. Interfaz de guardado y siete fallos antiguos siguen pendientes; A6/A/B/C abiertos, D no iniciado.


Continuacion de Idle: [publicacion/control del paseo restaurado](e-r3-native-idle-stroll-restoration-control-20261117.md). La peticion vinculada real viaja en baseline/evento y el control exige su fuente exacta, asociacion22, watermark e instalacion. El relevo asincrono reutiliza ambos puertos; cancelacion y cambios Task/Home/ancla/contrato invalidan la fuente anterior. Pasan 1838 pruebas/165 archivos, 53 especificas (26 nuevas) y build; los62 inputs nativos permanecen exactos, sin repetir GPU. Faltan roster/Surface/recursos/GPU de restauracion, productor/cohort integral, otros finales/puertas y recuperacion incremental de3123. Siete fallos antiguos siguen pendientes paraC; A6/A/B/C abiertos, D no iniciado.


Continuacion de Idle: [guardado/carga WALK en Game](e-r3-native-idle-stroll-restoration-game-20261117.md). Snapshot semantico, declaracion nueva, espera antes/despues del cuerpo y ejecucion22 conservan pose/fases/destino/RNG; Task/Home durante espera conservan la fuente real. Pasan 1812 pruebas/163 archivos, 19 nuevas, ambos WASM, regresion Task GPU y build. La interfaz de guardado sigue cerrada hasta consumidor grafico. Faltan publicacion/control/puertos/roster/Surface/GPU de restauracion, productor/cohort integral y otros finales/puertas; recuperacion incremental de3123 y siete fallos antiguos siguen pendientes. A6/A/B/C no se cierran; D no se inicia.


Continuacion de Idle: [referencia tipada del paseo restaurado](e-r3-native-idle-stroll-restoration-data-20261117.md). El bridge copia la peticion nativa nueva y su22 preparado/adquirido, valida la procedencia explicita y conserva llegada cero sin inventar21 ni permisos antiguos. Pasan 1793 pruebas/162 archivos, 30 especificas (ocho nuevas) y build; los62 inputs nativos permanecen exactos, sin repetir GPU. Faltan guardado/carga Game, publicacion/control y consumidor/GPU de restauracion; otros finales/puertas, productor/cohort y recuperacion incremental integral de3123 siguen pendientes. Los siete fallos antiguos siguen abiertos paraC. A6/A/B/C no se cierran.


Continuacion de Idle: [fuente nativa de restauracion del paseo](e-r3-native-idle-stroll-restoration-source-20261117.md). Una declaracion WALK nueva conserva pose/fases/destino/RNG guardados y adquiere un22 preparado sobre el cuerpo exacto, sin permisos antiguos ni20/21 ficticios; tambien conserva la llegada de longitud cero. Pasan 1785 pruebas/161 archivos, 43 especificas (15 nuevas), ambos WASM, regresion Task GPU y build. Falta guardado/carga Game, fuente tipada/publicacion/control y consumidor/GPU de restauracion; otros finales/puertas, productor/cohort y recuperacion incremental integral de 3123 siguen abiertos. Los siete fallos antiguos siguen pendientes de C. A6/A/B/C no se cierran.


Continuacion de Idle: [TaskStart movil en el consumidor original](e-r3-native-idle-moving-task-consumer-20261117.md). Roster/Surface/puertos/Host adquieren Task14 sobre el cuerpo detenido22 para una tarea solicitada durante WALK. NVIDIA/Turing conserva 685 IDs de geometria/bancos, retira solo el dato22 sustituido, reutiliza shaders/pipelines y mantiene 54 frames por bloqueo de 1800 ms. Prepara 70 recursos de protocolo y 122 copias de uniformes/bindings (14688 bytes), cero asignaciones tras READY. Pasan 1770 pruebas/160 archivos y build; siete fallos antiguos reproducidos en el padre siguen pendientes de C. Faltan restauracion movil, otros finales/puertas, productor/cohort ordinarios y recuperacion incremental integral de 3123. A6/A/B/C siguen abiertos.


Continuacion de Idle: [fuente TaskStart desde la parada movil real](e-r3-native-idle-moving-task-source-20261117.md). Fuente nativa/Game/control y ambos puertos conservan el cuerpo final22 durante la peticion Task14; rechazan reclamaciones durante WALK y avisos que rebobinan la pose. Pasan 1757 pruebas/158 archivos y 17 especificas (13 incluidas); siete fallos de la seleccion ampliada se reproducen en el padre y siguen abiertos. Ambos WASM, regresion Home en GPU y build validados. Falta consumidor grafico Task desde22 detenido, restauracion, otros finales/puertas, productor/cohort ordinarios y recuperacion incremental integral de 3123. A6/A/B/C siguen abiertos.


Continuacion de Idle: [Home desde el paseo suspendido en el consumidor original](e-r3-native-idle-moving-home-consumer-20261117.md). Roster/Surface/puertos/Host conservan la presentacion suspendida y adquieren Home18 desde la pose real22. NVIDIA/Turing conserva 678 IDs de geometria/bancos, retira solo el dato de ruta22 sustituido y reutiliza shaders/pipelines. Cada bloqueo de 1800 ms conserva 54 frames; prepara 70 recursos de protocolo y 120 copias de uniformes/bindings (13664 bytes), sin asignaciones tras READY. Pasan 1727 pruebas/153 archivos y build. Tarea/restauracion movil, otros finales/puertas, productor/cohort ordinarios y recuperacion incremental integral de 3123 siguen pendientes. A6/A/B/C siguen abiertos.


Continuacion de Idle: [fuente tipada y peticion Home desde el paseo suspendido](e-r3-native-idle-moving-home-data-20261117.md). La lectura retenida22 conserva pose/fases/retry y distingue procedencia de permiso ejecutable. Proyeccion/peticion de Game y control directo mantienen el cuerpo durante Home pendiente; la suspension antigua sigue estricta. Pasan 1719 pruebas/152 archivos, standalone/pthread y build. La parada anterior se revalida en NVIDIA/Turing con los binarios nuevos: 678 IDs conservados y cero asignaciones tras READY; no es aun Home grafico. Faltan roster/Surface/GPU de este origen, tarea/restauracion/cohort/producer, otros finales/puertas y recuperacion incremental integral de 3123. A6/A/B/C siguen abiertos.


Continuacion de Idle: [parada movil con pose final en el consumidor original](e-r3-native-idle-stroll-stop-final-consumer-20261117.md). Transactor/puertos/Surface/Host adquieren los valores nativos finales sobre el actor retenido mientras avanzan autoridad y paseo. NVIDIA/Turing dibuja 54 frames durante 1800 ms de bloqueo, conserva 679 IDs y no asigna tras READY; prepara 68 recursos de protocolo y 138 copias de uniformes/bindings (18432 bytes). La pose se instala una vez en los snapshots existentes. Pasan 1709 pruebas/151 archivos y build. Puertas/NeedsPlan, Home desde suspension, tarea/restauracion/cohort/producer y recuperacion incremental integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [template tipado de parada movil en el canal de terreno](e-r3-native-idle-stroll-stop-terrain-20261117.md). El slot existente conserva propietarios y efectos copiados, contabiliza los metadatos y exige el template exacto en preparador/ACK. Surface y el commit temporal siguen cerrados al relevo revalidado hasta integrar la pose final. Pasan 571 pruebas/42 archivos y build; la GPU anterior no se presenta como evidencia nueva. Faltan transactor y pose/fases/picking GPU finales con autoridad continua antes de Home; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [template y recibo de parada movil en el canal directo](e-r3-native-idle-stroll-stop-publication-20261117.md). El mismo hold exige identidad preparada, version propia y atestacion final; rechaza sustituciones, omisiones y mezcla con cuerpos antiguos. El Host rechaza explicitamente esta familia hasta conectar la pose final. Pasan 556 pruebas/41 archivos y build, sin repetir la GPU del commit anterior. Faltan transactor/terreno y muestreo GPU final con autoridad continua antes de Home; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [control directo de la parada movil preparada](e-r3-native-idle-stroll-stop-control-20261117.md). El permiso de metadatos conserva propietarios mientras avanza la autoridad; adquiere solo las revocaciones finales con su watermark y mantiene estricta la suspension anterior. NeedsPlan conserva el registro existente sin reloj de cuerpo. Pasan 399 pruebas/39 archivos, GPU previa con 679 IDs conservados y build. Faltan template/puertos y pose/fases/picking GPU finales con autoridad continua, antes de Home; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [referencia tipada y adaptador de la parada movil](e-r3-native-idle-stroll-stop-data-20261117.md). Propietarios inmutables y poses copiadas conservan el sobre12; captura/revalidacion/cancelacion y recibo contrastan frontera, asignacion, cuerpo y generacion nativos sin historial nuevo. Pasan 269 pruebas/24 archivos, standalone/pthread, GPU anterior con 681 IDs conservados y build. Faltan template/puertos/control y admision GPU final con autoridad continua, antes de Home; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen abiertos. A6/A/B/C no se cierran.


Continuacion de Idle: [revalidacion nativa de la parada movil](e-r3-native-idle-stroll-stop-revalidation-source-20261117.md). La fuente12 recompone la parada en la frontera final y conserva un origen preparado acotado. Rechaza el token anterior si cambia el cierre de cuerpos/motores y publica un recibo nativo preparado/adquirido. Pasan 1617 pruebas/142 archivos, ambos modulos, GPU previa con 681 IDs conservados y build. Falta la referencia tipada, refresco/admision GPU con autoridad continua y relevo Home; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [suspension grafica del paseo en propietarios existentes](e-r3-native-idle-stroll-stop-consumer-20261117.md). Codec/canal de terreno/Surface adoptan la familia12 sin chunks ficticios; roster/picking usan la epoca del movimiento retenido. NVIDIA/Turing conserva 679 IDs, cero shaders/pipelines y cero asignaciones tras READY. Preparar crea 68 recursos de protocolo y 120 copias de uniformes/bindings del Host (13408 bytes). Pasa 231/21 y build. La autoridad se mantiene durante preparacion: falta revalidacion movil antes del relevo Home, ademas de tarea/restauracion/cohort/producer y recuperacion integral de 3123. A6/A/B/C siguen abiertos.


Continuacion de Idle: [parada explicita preparada del paseo en el mundo nativo](e-r3-native-idle-stroll-stop-source-20261116.md). La familia12 usa el cierre existente de cuerpos/puertas y su frontera exacta, sin obstaculo ficticio ni cambios de geometria. Conserva cuerpo/slot para Home y rechaza candidatos temporales obsoletos. Faltan codec/control/puertos, batch grafico sin terreno y relevo Home completo; tarea/restauracion/cohort/producer y recuperacion integral de 3123 siguen pendientes. A6/A/B/C permanecen abiertos.


Continuacion de Idle: [fuente Home desde el paseo suspendido](e-r3-native-idle-moving-home-source-20261116.md). La peticion Home existente conserva slot, cuerpo y pose/fases ejecutadas de 22 despues de la suspension preparada; valida asignacion y generacion exactas, sin inventar20/21 ni consumir RNG. Faltan su integracion control/Game/puertos/roster/Surface, tarea durante paseo, restauracion/cohort/producer y recuperacion integral de 3123; A6/A/B/C siguen abiertos.


Continuacion de Idle: [TaskStart actual en los puertos y consumidor originales](e-r3-native-idle-current-task-consumer-20261116.md). El relevo21 de origen22 a TaskStart14 conserva el actor, geometria y bancos existentes. NVIDIA/Turing conserva 582 IDs residentes, no crea shaders/pipelines al relevar y no asigna despues de READY; prepara 70 recursos de protocolo y copias internas de uniformes/bindings separadas. Faltan tarea/Home movil, restauracion/cohort/producer y recuperacion integral de 3123; A6/A/B/C siguen abiertos.


Continuacion de Idle: [fuente TaskStart desde la pose posterior al paseo](e-r3-native-idle-current-task-source-20261116.md). La asignacion pendiente conserva el ciclo21 de origen22 y su cuerpo; el preparador14 existente valida fases/presupuesto y adquiere la ruta sin una fuente inicial ficticia. Fuente/control directo probados en standalone/pthread. Faltan puertos/roster/Surface/GPU de este relevo, productor ordinario, restauracion movil y recuperacion integral de 3123; A6/A/B/C siguen abiertos.


Continuacion de Idle: [Home actual en Game y consumidor originales](e-r3-native-idle-current-home-consumer-20261116.md). Control/Game/puertos/roster/Surface adquieren Home desde el ciclo 21 real posterior al paseo 22, incluido el callback inmediato sin marcador REST manual. NVIDIA/Turing conserva 577 IDs de geometria/texturas y reutiliza programas en descanso/Home; dos conjuntos retirados fijos por actor, textura 22 retirada tras fence y cero asignaciones tras READY. Preparar aun crea uniformes/bind groups y datos Home. Faltan TaskStart actual, tarea/Home movil, restauracion/cohort/producer y recuperacion integral de 3123; cierres A6/A/B/C siguen abiertos.


Continuacion de Idle: [fuente Home desde el ciclo actual](e-r3-native-idle-current-home-source-20261116.md). La ABI nativa retiene cuerpo/pose/fases de 21 con origen 20/22 y prepara Home mediante la peticion/ruta existentes, sin historia de permisos ni nuevo cuerpo. Standalone/pthread y regresion validados; faltan control tipado, Game, roster/Surface y GPU de este caso. Productor ordinario, restauracion movil, recuperacion integral de 3123 y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [descanso tras paseo en consumidor y GPU originales](e-r3-native-idle-arrival-consumer-20261116.md). Terrain/kernel/roster/Surface usan el extremo real 22 y adoptan REST 21. NVIDIA/Turing conserva 533 IDs de geometria/bancos y reutiliza shaders/pipelines al volver al descanso; retira la textura 22 tras fence y no asigna tras READY. Retencion acotada de materiales compilados en el actor existente. Preparar aun crea buffers/bind groups. Faltan tarea/Home actuales, restauracion movil y cohort/producer ordinarios; recuperacion integral de 3123 y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [fuente actual tipada y relevo paseo-descanso](e-r3-native-idle-arrival-data-20261116.md). La union20/22 usa la pose ejecutada y secuencia real, sin historial de permisos. Control exige paseo admitido, RouteCompleted y watermark; transactor/puertos conservan WALK hasta el commit y Game proyecta REST despues. Repeticion y carga estacionaria nueva pasan en ambos modulos. Faltan consumidor original GPU, tarea/Home, restauracion movil y cohort/producer ordinarios. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [descanso nativo desde el extremo real del paseo](e-r3-native-idle-arrival-source-20261116.md). La fuente21 distingue20/22, conserva cuerpo/pose/fases y adquiere REST sin adelantar RNG durante preparacion. Repite ciclos y paseos desde la ultima posicion con metadatos acotados en standalone/pthread. Faltan union tipada, consumidor grafico y Game de ese origen, tarea/Home y restauracion/cohorte ordinarios. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [paseo preparado22 en Surface y GPU originales](e-r3-native-idle-stroll-surface-20261116.md). La publicacion nueva adopta WALK ejecutado y Surface vuelve a ready. NVIDIA/Turing conserva actor/geometria/bancos y los IDs residentes; distingue copias nativas de uniformes y verifica cero asignaciones tras READY. Tick ordinario, descanso/tarea/Home desde la pose actual y carga semantica siguen pendientes. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [vista ejecutada del paseo22 en Game y transporte vivo](e-r3-native-idle-stroll-live-game-20261116.md). Copia pose, fases y WALK de la fuente actual despues de la adquisicion; al llegar no adelanta REST ni RNG. El codec vivo valida la semantica sin handles/corredores. Cohorte del tick y guardado siguen cerrados hasta sus fuentes/restauracion; perder el propietario no permite fallback JS. Faltan Surface/hardware y relevos completos. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [paseo22 sobre el actor y bancos originales](e-r3-native-idle-stroll-roster-20261116.md). El reemplazo preparado conserva actor/geometria/indices y restaura material y visibilidad al cancelar. Exige ciclo21 y fase Game genuinos, recursos confirmados y asociaciones coincidentes; una liberacion vieja no retira al sucesor. GLB/roster/builders reales con renderer simulado: faltan Surface, Game22 y hardware. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [kernel, reloj y Host directo del paseo22](e-r3-native-idle-stroll-gpu-clock-20261116.md). Reutiliza el programa finito Home con permiso propio, conserva identidades al reajustar y usa el float enviado para picking. La retirada conserva el origen adquirido; el ciclo anterior sigue visible mientras se prepara. Fuente/puertos/Host reales con GPU simulada: faltan actor/Surface originales, hardware, Game y fuente estacionaria posterior. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [paseo22 en el transactor y los puertos existentes](e-r3-native-idle-stroll-admission-20261116.md). Prepara una vez, drena, revalida el programa nativo y publica asociacion/clock antes del relevo. Template, version y familia son propios; cancelacion y renovacion conservan cuerpo, destino y RNG. Fuente/control/canales reales con recibo simulado: faltan consumidor GPU22, Game y fuente estacionaria posterior. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [paseo22 en el control directo existente](e-r3-native-idle-stroll-control-20261116.md). La fuente publica su asociacion nativa exacta y el permiso distingue preparacion, adquisicion y presentacion instalada. Contrasta el WALK emitido y el ciclo presentado; rechaza programas alterados, bootstrap y watermark ajeno. Faltan transactor/puertos, consumidor GPU22, Game y fuente estacionaria posterior. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [referencia tipada y adaptador de la fuente del paseo22](e-r3-native-idle-stroll-data-20261116.md). Captura, revalidacion, cancelacion y lectura de la asociacion/pose reales usan handles y valores acotados, sin cadenas de permisos ni consumo de RNG en JS. La preparacion comprueba Game21 ejecutado; un arranque grafico con22 activo falla cerrado. Faltan transactor/puertos/control y consumidor preparado22, Game y fuente estacionaria posterior. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [fuente preparada del paseo nativo22](e-r3-native-idle-stroll-source-20261116.md). Ejecuta la decision WALK genuina sobre las reservas, reloj y cuerpo existentes; una revision de navegacion consulta el mismo destino sin consumir RNG. La llegada retiene el extremo y solo ofrece el REST deseado, sin permiso para ejecutarlo. Fuente standalone/pthread y regresion validadas; faltan referencia/adquisicion grafica22, Game y fuente estacionaria posterior. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [fase ejecutada21 y carga semantica en Game](e-r3-native-idle-cycle-game-20261116.md). El tick proyecta descanso/vigilancia y conserva la vigilancia terminada mientras REST o paseo esperan recursos; tarea y vencimiento de contrato usan los relevos genuinos. La carga reconstruye permisos nuevos y la misma intencion desde el RNG privado en ambos modulos. NVIDIA/Turing pasa REST y Home con Game, sin la asignacion manual anterior de la fase deseada; recursos residentes conservados y cero asignaciones tras READY. Paseo ejecutable/aproximacion/anclas, productor ordinario, recuperacion integral de 3123 y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [consumidor preparado 21 sobre el actor y Surface residentes](e-r3-native-idle-cycle-consumer-20261116.md). Descanso/vigilancia, siguiente REST y Home inmediato pasan en NVIDIA/Turing conservando los 533-577 IDs residentes de cada caso y sin copiar buffers estaticos ni texturas. El ciclo repetido reutiliza shaders/pipelines; se corrige la suciedad redundante de atributos de cultivos. Se contabilizan tambien las copias nativas de uniformes, distintas de los IDs de protocolo; cero asignaciones tras READY. Faltan proyeccion/persistencia Game21, paseo/aproximacion/anclas y productor ordinario. Recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [grafo de fase y reloj del consumidor directo 21](e-r3-native-idle-cycle-gpu-clock-20261116.md). El Host exige plantilla, reloj y adquisicion preparados exactos; acota solo la fase Idle y permite continuar al companero. Picking usa el float realmente enviado. La prueba de identidades conserva el buffer estatico y distingue la copia temporal de 16 bytes y su binding, sin confundir cero IDs nuevos con cero asignaciones GPU. Falta integrar roster/Surface originales, Game y evidencia en hardware; productor ordinario, recuperacion integral de 3123 recursos y cierres A6/A/B/C siguen abiertos.


Continuacion de la politica Idle: [familia 21 en el transactor y transporte existentes](e-r3-native-idle-cycle-admission-20261116.md). La propuesta comprueba cuerpo, pose, contrato, ancla y secuencia privada; prepara una vez, drena, revalida y publica el recibo nativo exacto. Los puertos conservan el tipo tambien al renovar recursos. La prueba usa fuente/puertos reales y consumidor simulado: faltan dibujo GPU21, proyeccion/persistencia de Game y evidencia en hardware. No se anuncia capacidad grafica ni cambia ningun cierre A6/A/B/C; productor ordinario y recuperacion integral de 3123 recursos siguen abiertos.


Continuacion de la politica Idle: [ciclo y siguiente peticion en el control directo existente](e-r3-native-idle-cycle-control-20261116.md). Los eventos llevan adquisicion y sucesor tipados; el permiso exige fuente previa admitida, secuencia, programa y reloj nativos exactos. Conserva el registro al esperar tarea/Home y congela la fase al interrumpir; otra adquisicion o retirada lo revoca. El baseline transporta datos sin conceder permiso y Host aun rechaza su arranque historico. Faltan consumidor/transactor preparados 21 y proyeccion/persistencia de Game; politica completa, productor ordinario y recuperacion integral siguen abiertos. Ningun cierre A6/A/B/C cambia.


Continuacion de la politica Idle: [ciclo temporal nativo con la secuencia privada original](e-r3-native-idle-cycle-source-20261116.md). La fuente prepara descanso/vigilancia completos sobre el cuerpo existente y resuelve una sola peticion posterior de descanso o paseo al llegar a su frontera. Conserva reloj, RNG privado, doce intentos locales y cuerpo; un paseo pendiente no concede movimiento. La fase retenida anterior ya no sirve como consumidor de este ciclo. Faltan control/consumidor preparados de la familia 21, proyeccion/guardado de Game, aproximacion, ejecucion del paseo, cambios de ancla y productor ordinario; ningun cierre A6/A/B/C cambia.


Continuacion de la politica Idle: [inicializacion estacionaria con la semantica original](e-r3-native-initial-idle-initialization-20261116.md). Una declaracion nueva puede inicializar descanso en su ancla real sin navegar, avanzar tiempo ni consumir RNG. Comparte el inicializador de Idle existente y publica Game solo tras aceptar la fuente nativa; rechaza actores que necesitan aproximacion y declaraciones ya pendientes. La politica temporal/Alert/paseo, aproximacion, productor ordinario y recuperacion integral siguen abiertos; no cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [consumidor preparado sobre el cuerpo inicial real](e-r3-native-initial-idle-body-consumer-20261116.md). Puertos, Surface, control y picking admiten descanso/vigilancia inicializados sin tarea/Carry previos y conservan actor/geometrias. NVIDIA/Turing: 98 recursos durante preparacion y cero tras READY; Home inmediato tambien conserva propietarios y usa 98/0. La fase privada permanece retenida: politica completa, productor ordinario, otras clases/puertas y recuperacion integral de 3123 recursos siguen abiertos. No cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [asociacion del cuerpo inicial en el control directo](e-r3-native-initial-idle-body-control-20261116.md). El registro existente exige peticion, adquisicion y reloj nativos exactos; conserva el cuerpo al pedir tarea/Home y revoca su permiso al relevarlo o retirarlo. Aun faltan transactor por puertos, consumidor preparado y politica completa; el bootstrap historico sigue rechazado. No cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [propiedad nativa del cuerpo inicial retenido](e-r3-native-initial-idle-body-source-20261116.md). La fuente admite descanso/vigilancia ya inicializados sobre el mismo cuerpo y reloj, conserva pose/fases/RNG y permite relevos reales a tarea o Home. La carga crea otra peticion; el bootstrap grafico aun rechaza esta clase. Faltan transactor/consumidor preparado y politica completa; no cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [variante compartida Idle/Alert sobre el actor residente](e-r3-native-idle-alert-variant-20261116.md). El selector existente prepara ambos clips originales, conserva actor/geometrias/materiales/clave estructural y permite revertir una vigilancia activa. Es preparacion grafica, sin permiso nativo nuevo ni consumidor Idle inicial completo. Faltan su admision estacionaria y politica completa; no cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [peticion pendiente en el control grafico existente](e-r3-native-initial-idle-control-20261116.md). Eventos y baseline transportan la referencia con cuerpo, ligada a sesion/secuencia/reloj, sin conceder ejecucion. Los relevos a Home/tarea revocan los datos anteriores y Home conserva exactamente cuerpo y pose. Faltan admision grafica inicial y politica completa Idle/Alert/paseo; no cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [espera en el reloj comun, tarea y Home](e-r3-native-initial-idle-clock-20261116.md). Game retiene cuerpo, fases y RNG mientras un companero admitido avanza. El vencimiento crea Home sobre la fuente real incluso antes del primer cuerpo; una tarea usa la admision pendiente existente. Nacimientos sin cuerpo se rechazan antes de alterar una cohorte viva. Faltan admision grafica inicial, politica completa de Idle y productor ordinario; no cambia ningun cierre A6/A/B/C.


Continuacion de Idle inicial: [declaracion de Game, comprobacion y carga semantica nueva](e-r3-native-initial-idle-game-20261116.md). Conserva pose, fases, RNG y ancla sin recuperar permisos anteriores; valida antes de sustituir la sesion y exige un mundo fisico nuevo. La clase aun rechaza avanzar Game antes de su admision preparada. Faltan reloj/cohorte, tarea/Home previo a READY, consumidor y politica completa de Idle; no cambia ningun cierre A6/A/B/C.


Continuación de Idle inicial: [petición semántica nativa sin historial ficticio](e-r3-native-initial-idle-request-20261116.md). Conserva pose, perfil, descanso/vigilancia, fases, RNG y ancla en el mismo propietario; el cuerpo queda retenido y una tarea real puede sustituir la petición mediante recursos pendientes. Pasan 732 pruebas y ambos módulos nativos. El proyector de Game, admisión gráfica y ejecución de los ciclos/paseo siguen pendientes; no se activa la partida ni cambia ningún cierre A6/A/B/C.

Continuación de Idle: [Home inmediato durante adopción de Surface](e-r3-native-idle-home-consumer-20261116.md) sobre el mismo cuerpo y actor. NVIDIA/Turing: 96/98 recursos al preparar Idle/Home, cero tras READY; 54 dibujos del Idle durante el bloqueo inicial de Home y 53 posteriores, con identidades, selección y drenaje conservados. Idle inicial, otras tareas/finales, puertas, productor ordinario y recuperación integral siguen pendientes. No cambia ningún cierre A6/A/B/C.

Continuación de Idle: [fin del contrato y nueva petición Home](e-r3-native-idle-home-20261116.md) sobre el mismo cuerpo, sin modificar la liquidación histórica. Pasan vencimiento diario y frontera horaria en ambos módulos, puertos reales con GPU simulada y roster original reversible. Falta el relevo inmediato durante adopción Idle en Surface y su comprobación en hardware; Idle inicial, otras tareas/finales, puertas, productor ordinario y recuperación integral siguen pendientes. No cambia ningún cierre A6/A/B/C.

Continuación de Home: [carga del regreso con petición nueva](e-r3-native-home-restoration-20261115.md), sin restaurar permisos anteriores ni fabricar una liquidación. La espera conserva cuerpo, pose y presupuesto incluso antes del primer reloj. NVIDIA/Turing: 100 recursos al preparar, cero después de READY y 53 dibujos durante bloqueo de 1,8 s; actores y lotes residentes conservados. Sustitución de una partida viva, Idle inicial/fin de contrato, puertas, productor ordinario y recuperación integral siguen pendientes; no cambia ningún cierre A6/A/B/C.

Continuación de Home: [restauración de trabajadores ya inactivos](e-r3-native-home-inactive-restoration-20261115.md). La carga declara su ausencia sobre el registro nativo nuevo, sin cuerpos, corredores o permisos gráficos anteriores; el reloj vacío existente admite la cohorte en casa y los compañeros activos conservan su admisión normal. Home aún en movimiento, productor ordinario y recuperación integral siguen pendientes; no cambia ningún cierre A6/A/B/C.

Continuación de Home: [retirada en el consumidor real](e-r3-native-home-absence-consumer-20261115.md), con paquete de ausencia y revocación nativa exactos. NVIDIA/Turing: cero creaciones al preparar y después de READY (2911 constantes), 52 dibujos durante bloqueo de 1,8 s, un actor retirado y los demás recursos conservados. La publicación antigua no lo resucita; selección y drenaje correctos. Restauración nueva, otras clases, productor ordinario y recuperación integral siguen pendientes; no cambia ningún cierre A6/A/B/C.

Continuación de Home: [ausencia reversible sobre el roster residente](e-r3-native-home-absence-roster-20261115.md). La captura restaura enseguida la visibilidad y selección anteriores; el commit nativo oculta el actor y la presentación permite retirar su propietario Home. No añade recursos de movimiento. Faltan el transporte/Surface, admisión directa y hardware de esta ausencia; la capacidad no se anuncia ni cambia ningún cierre A6/A/B/C.

Continuación de Home: [llegada y retirada nativa preparada](e-r3-native-home-arrival-source-20261115.md). El cuerpo permanece retenido hasta el commit de su extremo ejecutado; sólo entonces se elimina por el registro existente y se proyecta `home`. Una secuencia nativa distingue la retirada preparada de una etiqueta JS o fila sin cuerpo. La ausencia gráfica preparada sigue pendiente y los canales reales aún rechazan esa clase; no cambia ningún cierre A6/A/B/C.

Continuación de Home: [consumidor gráfico sobre el actor residente](e-r3-native-home-route-consumer-20261115.md), con plantilla y asignación directa reales. NVIDIA/Turing conserva actores y geometrías: 98 recursos al preparar, cero después de READY y 52 dibujos durante bloqueo de 1,8 s; selección y drenaje final correctos. La llegada/retirada, restauración nueva, productor ordinario y recuperación integral siguen pendientes. No cambia ningún cierre A6/A/B/C.

Continuación de Home: [corredor nativo y proyección en Game](e-r3-native-home-route-source-20261115.md) sobre el mismo cuerpo y protocolo común, sin tarea ficticia. La ruta y la retención de su extremo se validan en ambos módulos nativos; el consumidor gráfico, la retirada al llegar y la admisión nueva al restaurar siguen pendientes. No cambia ningún cierre A6/A/B/C.

Continuación de entrega con contrato terminado: [cuerpo retenido para Home](e-r3-native-delivery-home-pending-20261115.md). El resultado preparado conserva `returning`, cobra una sola vez y excluye nuevas tareas sobre el mismo cuerpo. NVIDIA/Turing: 96 recursos al preparar, cero después de READY y 50 dibujos durante bloqueo. La ruta Home ejecutable y su llegada siguen pendientes; no cambia ningún cierre A6/A/B/C.

Continuación del consumidor de entrega: [Carry → Idle → tarea genuina siguiente en el consumidor real](e-r3-native-delivery-live-consumer-20261115.md), para entrega sin puertas y contrato activo. Pasan 538 pruebas; NVIDIA/Turing conserva el actor y sus geometrías, con 96/98 recursos al preparar, cero después de READY y 52/54 dibujos durante bloqueos. Home, Idle inicial, puertas, productor ordinario y recuperación integral siguen pendientes; no cambia ningún cierre A6/A/B/C.

Continuación de la autoridad de entrega: [Carry → disponibilidad nativa → siguiente tarea](e-r3-native-delivery-settlement-20261115.md), con liquidación coherente y cuerpo conservado. El consumidor gráfico del relevo, Home, Idle inicial y productor ordinario siguen pendientes; no cambia ningún cierre.

Continuación de la entrega: [datos semánticos y liquidación sin efectos anticipados](e-r3-native-delivery-consequence-data-20261115.md), con el cálculo económico ordinario común y 50/50 pruebas. El relevo nativo/gráfico y el cobro preparado siguen pendientes; no cambia ningún cierre.

Continuación del consumidor: [Harvest → Carry con preparación incremental y selección GPU](e-r3-native-consequence-presentation-20261115.md), sobre el actor y lote existentes; 54 fotogramas durante bloqueo, cero asignaciones después de READY. Entrega preparada, productor ordinario y recuperación integral siguen pendientes; no cambia ningún cierre.

Actualizado: 2026-11-15. IDs acordados en la conversación; no se renumeran al avanzar.

Último incremento del camino crítico: [restauración de acciones con progreso y admisión nueva](e-r3-native-action-restoration-20261115.md), sobre el mismo propietario nativo y reloj común; productor ordinario, consecuencias preparadas y recuperación integral siguen pendientes.
Continuación de autoridad: [consecuencia nativa Harvest y propietario Carry](e-r3-native-harvest-consequence-source-20261115.md), con proyección en Game y transactor común. La preparación gráfica del cultivo/caja, sus consumidores y el productor ordinario siguen pendientes; no cambia ningún cierre.
Publicaciones ordinarias y aceptación integrada de personajes autónomos siguen pendientes; no cambia el recuento de cierres.

**Ningún punto principal está cerrado todavía.** Un subpunto marcado como nativo
implementado/validado no autoriza por sí solo activar autonomía GPU o retirar el
ejecutor protegido de producto. A6 incluye todas las intenciones y trabajadores.

## Vista de entrega y pendientes fijos

**Situación de producto:** no se han activado los nuevos cruces nativos ni los
personajes autónomos en GPU en la partida ordinaria. Las mallas originales de puerta
y la reproducción GPU del trabajador original tienen pruebas de componente. La
alimentación ordinaria y las transiciones de clips siguen pendientes. Desde la
petición de cerrar e/f se han cerrado **0 de esos 2 subpuntos**. Sus componentes internos avanzaron, pero la entrega integrada no.
En el desglose fijo de entrega, **e-R1, e-R2, f-R1, f-R2 y f-R3 están cerrados; quedan 3 de 8**.

**Niveles que no se suman:** A6 tiene 11 puntos principales, todos abiertos.
Dentro de A6-04, a–d están marcados implementados/validados en el dominio nativo
actual; e/f están parciales. Los IDs siguientes solo desglosan el alcance que ya
estaba dentro de e/f; no son funcionalidades adicionales ni renumeran A6-01–11.

### Componentes ya implementados, con sus límites

| Componente | Hecho | Límite de lo entregado |
|---|---|---|
| Geometría/reloj/política | Hojas autoradas, apertura de 0,6 s, proximidad, ocupación y espera en C++; mecanismo nativo marco/hoja/apoyo consumido por colisión y `NativeWall`. | Clase validada: puertas intactas sobre datum plano nativo de Desierto. No activado en la partida; integración y ciclo de vida son e-R3. |
| Barridos y protección | Contacto continuo contra cuerpos, objetos canónicos y otras hojas; veto previo de mutaciones incompatibles. La unión del mecanismo conserva todas sus regiones ocupadas. | No certifica apoyos arbitrarios/inclinados ni física de otras clases; se rechazan explícitamente. |
| Timetable y fases | Esperas iniciales/intermedias, admisión atómica opt-in por puertas cerradas, cierre previo conservado hasta la inversión y suspensión/reanudación del sufijo con fases/presupuesto acumulados. | El lector de candidatos anterior sigue sin admitir. La nueva API exige el mecanismo validado de e-R1. No activa producto/GPU ni persistencia entre acciones/guardados. |
| Control directo y recibo GPU | Revocación por época/versión, canal independiente de preparación, frontera finita de tiempo ya ejecutado en nativo y recibo GPU ligado también a su versión de reloj. | f-R1 cerrado para el cohort nativo opt-in. Un recibo/reloj no resuelve todos los consumidores de producto, relevo ni aplicación gráfica de las mutaciones. |
| Propuesta y commit condicionado | Overlays, residencia, props y terreno: propuestas nativas no efectivas, tickets de un uso, preflight y commit tras quiescencia/drenaje GPU. Incluye publicación pthread. | Dominio nativo actual y un consumidor causal opt-in. Faltan consumidores/relevo y recursos gráficos coordinados; no activar en partida. |

Son cinco componentes agrupados para visibilidad, no cinco entregables de producto
cerrados ni una medida porcentual. Cantidades de pruebas/commits son evidencia,
no el indicador principal de avance.

### Entregables de cierre: 5 cerrados, 3 pendientes

Se mantienen estos IDs al avanzar. Algunos comparten
dependencias con A6-01/02/06/07/08/09; no se cuentan otra vez como trabajo nuevo.

| ID fijo | Entrega y estado | Criterio observable de cierre |
|---|---|---|
| **A6-04.e-R1** | **CERRADO — Mecanismo físico marco/hoja y apoyo 3D.** | Un estado nativo coherente define marco, hoja y apoyo para colisión y dibujo; validar los materiales móviles sin ignorar falsamente sus contactos propios. [Evidencia de las tres mallas reales WASM/WebGPU](performance/native-gate-mechanism-20261109.json). |
| **A6-04.e-R2** | **CERRADO — Aperturas futuras, reservas y admisión de cruces.** | Autorizar una ruta completa a través de puertas que inicialmente no estén abriendo; reservar el intervalo, impedir cierre sobre el cruce e invalidar/reanudar por eventos. [Aceptación nativa integrada y reproducible](performance/native-gate-crossing-resume-20261109.json). |
| **A6-04.e-R3** | Integración de puertas con entidades y ciclo de vida. | Usar esas decisiones en las intenciones pertinentes de la partida, con llegadas/consecuencias, cancelación, guardado/restauración y recuperación; sin dos ejecutores autoritativos. |
| **A6-04.e-R4** | Aceptación de puertas con personajes reales. | Partida WASM/WebGPU con trabajadores y animales, respetando qué puede cruzar cada uno; obstáculos, esperas, pausa/velocidad, acciones, guardado y determinismo. No basta el triángulo. |
| **A6-04.f-R1** | **CERRADO — Frontera causal de tiempo y comandos.** | Simulación y dibujo aplican avances, pausa, velocidad y revocaciones en una frontera segura; no presentar movimiento que ya no puede autorizarse ni corregirlo mediante rebobinado. [Ejecución real WASM/WebGPU y tres bloqueos de preparación](performance/native-causal-clock-20261109.json). |
| **A6-04.f-R2** | **CERRADO — Commit condicionado para las demás mutaciones.** | Extender la propuesta todavía no efectiva y su commit seguro a overlays, residencia, props y terreno, no solo al motor de puerta. [Seis casos WASM/WebGPU](performance/native-world-mutations-20261109.json). |
| **A6-04.f-R3** | **CERRADO — Todos los consumidores, relevo y fallos.** | La seguridad cubre consumidores activos/temporales, sustitución de Workers, pérdida de dispositivo y canal perdido o silencioso; un ACK viejo no permite aplicar cambios. [Relevo real WASM/WebGPU](performance/native-control-lifecycle-20261113.json) y [alcance/registro nativo](migration-checkpoint-20261113.md#cierre-del-criterio-de-seguridad-f-r3). |
| **A6-04.f-R4** | Aplicación gráfica de la misma mutación. | Recursos y dibujo representan el cambio físico coordinado; probarlo con personajes reales y preparación bloqueada, sin depender de publicaciones periódicas de posición JS. |

Avance de f-R4: [identidad de recursos ligada al commit nativo](f-r4-resource-boundary-20261113.md).
Los paquetes que llegan tarde, los command buffers antiguos y los envíos directos
no pueden adoptar la época nueva por su momento de recepción. El reemplazo GPU
se comprueba con preparación bloqueada; payload visible y personajes reales
siguen pendientes. No cambia la cuenta fija de entregables.

**Alcance del cierre de e-R1:** mecanismo cinemático de unión ocupada, materiales
zarzas/empalizada/reforzado intactos y apoyo plano validado por el terreno nativo.
No se alteran mallas, bisagras ni velocidad. No se declara separación interna de
sus piezas: las zonas de solapamiento siguen ocupadas para cuerpos/obstáculos,
sin excepciones por ID. Apoyo no plano/desconocido y cambio visual/de ciclo de
vida no soportado rechazan explícitamente; no hay fallback silencioso ni activación
en la partida. La expansión de clases y la integración pertenecen a A6-05/e-R3.

**Alcance del cierre de e-R2:** `nav_gate_admit_route` prueba y publica en una
operación la ruta existente, esperas, motores futuros y reservas ligadas a
sesión/slot/generación/cuerpo. El ejecutor nativo la recorre sin repetir geometría
o planificación en pasos ordinarios. Se validan las tres puertas cerradas,
múltiples puertas, tráfico, marcos/hoja abierta, fases/presupuesto, tareas,
mutaciones rechazadas y cancelación antes/durante el cruce. La política no puede
congelar/cerrar una promesa reservada ni borrar su puerta. Cancelar una apertura
congela el motor y revoca por eventos las rutas dependientes; un cuerpo detenido
en el paso mantiene la protección de ocupación.

La suspensión ahora revoca el handle ejecutable y conserva el mismo `RouteSlot`,
su sufijo y pose congelada. La reanudación por comando/evento nativo vuelve a
probar el sufijo y reservas antes de asignar una generación nueva, sin planner.
Offsets nativos conservan distancia/fases/presupuesto incluso en esperas o
suspensiones repetidas. Fallar por tráfico/obstáculos conserva el sufijo; cancelar,
cambiar objetivo, retirar cuerpo o reiniciar autoridad lo descarta. La reanudación
no es un timer ni un retry por tick, y no activa consecuencias de gameplay.

También se conserva un cierre ya autorizado hasta el instante nativo de petición
futura; se invierte continuamente desde su pose prevista, manteniendo la regla
de 0,6 s. Los nudos y cotas de movimiento cubren ambos tramos en las pruebas de
cuerpos/objetos/otras hojas. Cancelar al principio, aun con apertura actual 1,
retira también ese cierre futuro y suspende las rutas que dependían de él.

Las reservas se retienen hasta liberar la ruta; no caducan por timer ni programan
cierre automático. Un evento posterior de política puede cerrar solo después de
liberar y comprobar ocupación/trayectorias. Es la clase física nativa de e-R1,
no activación en gameplay, persistencia entre acciones/guardados, resolución de
todo el tráfico o aceptación con personajes. Esos límites ya pertenecen a los
IDs pendientes; no se añaden nuevos entregables.

**Evidencia del criterio, no porcentaje de avance:** el escenario WASM integrado
recorre dos puertas inicialmente cerradas con la polilínea elegida, se suspende
ante la segunda, conserva el sufijo/fases/carrera, rechaza una reanudación con
obstáculo y se readmite tras retirarlo hasta llegada/fin. Repetir el registro de
comandos da el mismo resultado. Los 300 avances ordinarios no añaden geometría,
sensores, barridos o consultas de planificación. Las pruebas complementarias
verifican cierre protegido, ocupación detenida, los tres materiales, inversión
parcial de cierre, reservas compartidas, épocas/generaciones y fallos atómicos.

**Límite de integración descubierto:** algunos conectores del planner anterior
tocan el marco real. La admisión los rechaza y conserva ruta/tarea/objetivo; no
los desvía ni ignora contactos. Se comprueban tanto este rechazo como tareas
admisibles cuando el corredor autorado y el conector coinciden. Producir rutas
de gameplay compatibles pertenece a la integración ya pendiente, no se da por
resuelto por admitir una polilínea de prueba.

**Alcance del cierre de f-R1:** el reloj opt-in se publica desde el estado del
cohort realmente ejecutado por Wild Engine, nunca desde el futuro que propone
un paquete preparado. `committedThrough` es finito; dibujar puede interpolar
dentro de esa frontera, no sobrepasarla ni ampliar el límite válido de recursos
del paquete, ni activar recursos futuros antes de su inicio válido. Requiere una base nueva consciente del reloj, no actualiza a ciegas
un consumidor histórico ya vivo. El modo pertenece a la conexión: quitar una
etiqueta de ruta en otra generación no lo desactiva. Pausa/velocidad y revocaciones llegan
por el mismo canal directo, fuera de preparación/recursos, y no rebobinan tiempo.
El modo causal bloquea avances nativos durante pausa y cambios de tiempo por
fuera del ejecutor. Contadores de reloj e intención, época y sesión se validan
antes de conceder tiempo; una propuesta de motor anterior a cambiar política
de reloj queda obsoleta aunque el tiempo lógico sea el mismo.

La aceptación real usa un plan nativo admitido/ejecutado, un paquete GPU y tres
bloqueos síncronos de 500 ms: pausa/cambio de velocidad, ejecución a velocidad ×2
y silencio hasta agotar la frontera seguido de revocación. Hubo 15 dibujos por
bloqueo, sin superar ninguna frontera ejecutada ni retroceder; el recibo GPU
llegó antes de desbloquear preparación. Hay readback de posición/fases/carrera
GPU contra el sampler nativo y contadores geométricos sin cambios. Es triángulo
diagnóstico, no aceptación con personajes. Si la autoridad no publica avances,
el dibujo se detiene: la existencia de una ruta futura no concede tiempo no
ejecutado. No se activa este modo en gameplay ni se retira el fallback protegido.

**Alcance del cierre de f-R2:** las cuatro familias del criterio usan una
propuesta nativa no efectiva y el mismo commit condicionado: barreras individuales
y en lotes, polígonos y permeabilidad; altas/bajas de residencia y publicación
pthread; supresión/restauración canónica de props; lotes/reemplazo de asentamientos
del terreno. El preflight conserva los vetos actuales y no publica mundo, IDs ni
revocaciones. Se confirma solo tras el recibo GPU exacto; cambios de cuerpo,
mundo, ruta, reloj o motor durante la espera invalidan el ticket. La mutación
canónica vuelve a comprobar sus dependencias al commit; no hay planner JS ni
comprobación geométrica periódica.

Tras un commit efectivo se invalida el paquete anterior y se rechazan los que
todavía estaban esperando recursos; no se inventa un frame actualizado: la imagen
permanece detenida hasta que llegue otro paquete. Las operaciones GPU fuera de
frame tampoco pueden colarse durante el drenaje. **Dependencia descubierta:**
mantener la imagen y generar/aplicar los recursos nuevos de manera coordinada es
f-R4; la protección de todos los consumidores y relevos sigue en f-R3. Este
incremento no acredita ninguno de esos IDs ni activa el camino en producto.
Las altas/bajas de chunk actualizan el espejo JS existente únicamente con los
resultados nativos; el enlace con el stream/recursos de juego sigue sin activar.
Si falla la conversión después de un commit físico, se cierra el canal: nunca se
libera como si el commit no hubiera ocurrido.

[Evidencia WASM/WebGPU de una barrera](performance/native-barrier-mutation-20261109.json)
y [seis operaciones de las cuatro familias](performance/native-world-mutations-20261109.json),
cada una durante un bloqueo real de 500 ms. El paquete previo se mantiene
congelado tras el commit; no se afirma que la geometría nueva ya esté dibujada.
El dominio es el validado por A6-04.a–d; no se generaliza silenciosamente a
terrenos/estados no soportados. Las recetas de props/terreno se comprueban de
nuevo al commit nativo: ese coste de evento y la congelación hasta recursos nuevos
quedan explícitos, no son trabajo por tick ni aceptación de rendimiento integrado.

**Siguiente bloqueo concreto:** f-R4, representación gráfica coordinada de la
mutación. Junto con la integración de entidades de e-R3 permite aceptar e-R4.

**Incremento f-R3, 13 de noviembre:** registro de consumidor actual y candidato
en la autoridad, retirada directa con congelación/drenaje GPU y tokens por
conexión, mutación bloqueada durante relevo y rechazo conservador de propietarios
sin prueba. Pérdida real de dispositivo y disposición drenada se distinguen de
un cierre de puerto. [Auditoría, implementación y límites](migration-checkpoint-20261113.md).
El primer incremento era parcial; el registro nativo de todas las colas y sus
comprobaciones antes/después de cada frontera completan el criterio de seguridad
de f-R3. No se habilita autonomía de producto ni se cierra el padre f.

**Alcance de f-R3:** mismas clases nativas opt-in que f-R1/f-R2. Los publicadores
se registran en su bridge con el propietario de frontera; una mutación o motor
de puerta no acepta un recibo individual que omita otra cola. Una cola que llega
durante la espera invalida la propuesta antes del commit. Dejar de observar o
cerrar un puerto conserva su entrada; solo un drenaje certificado permite
retirarla. El relevo de la autoridad usa el mismo registro de consumidores.
La política ante un canal irrecuperable es fallo explícito y ausencia de commit;
no se simula progreso, no se concede tiempo futuro y no se descarta ese
propietario incierto al abrir un Worker nuevo. Recuperar un dispositivo perdido
real sí conserva la autoridad, como acredita el recibo de navegador. Las
mutaciones coordinadas ya pueden adoptar el paquete preparado durante un
bloqueo del preparador, incluidos cuerpo suspendido/puerta fija y su reanudación
preparada con el trabajador original. La reanudación cubre la entrada nativa
explícita Idle a Walk; asignaciones ordinarias, demás acciones y alimentación/
aceptación ordinarias siguen dentro del criterio f-R4 pendiente.

**Cómo se informará el avance:** entrega cerrada y evidencia; entrega parcial
y qué criterio falta; IDs aún pendientes; cambios de alcance descubiertos,
si los hubiera, señalados expresamente. No añadir requisitos silenciosamente a
esta lista ni presentar más pruebas aisladas como cierre del producto.

## Checklist principal y detalle técnico

- [ ] **A6-01 — Integración con gameplay.** Conectar ejecución nativa a entidades,
  llegadas, cambios de intención y fronteras de acción en la partida real, sin
  dos autoridades de movimiento. El núcleo cinemático opt-in existe; la
  integración completa de consecuencias sigue pendiente.
- [ ] **A6-02 — Estado persistente de locomoción.** Mantener fases, presupuesto y
  transiciones entre intenciones y guardados. Hay paridad temporal de marcha,
  carrera/carga/huida de trabajadores; faltan offsets persistentes y transiciones
  todavía no representadas, incluida entrada de animales.
  Las esperas iniciales/intermedias del timetable ya detienen fases y carrera;
  no equivalen aún a offsets persistidos entre intenciones o guardados.
- [ ] **A6-03 — Resolución de tráfico.** Hay detección continua y cierre de
  paradas. Faltan esperas/cesiones de tráfico, desvíos y reanudación por eventos, sin
  inanición ni planner JS paralelo.
- [ ] **A6-04 — Mutaciones restantes del mundo.** Parcial:
  - [x] **A6-04.a — Overlays nativos.** Muros/polígonos, máscaras y lotes con
    preflight, revocación dirigida y cierre de paradas. Commit `4ea5d2334`.
  - [x] **A6-04.b — Residencia nativa y retención.** Altas síncronas/pthread,
    retirada explícita dirigida, pins de cuerpos/halos y leases futuros,
    liberación gráfica no forzosa e inventario coherente. Implementado y validado
    en el dominio nativo actual; no activación general del ejecutor de producto.
    Evidencia: 17 pruebas WASM nuevas (dos con pthread real), batería dirigida
    de 311 y batería heredada de streaming/geometría de 39, sin skips.
  - [x] **A6-04.c — Props nativos.** Supresión monótona y restauración transaccional
    desde la receta C++ actual; cuerpos, sufijos futuros, leases preparados,
    decoración, halos y ausencia de witnesses cubiertos. Implementado/validado
    en el dominio nativo actual, sin activar el ejecutor general de producto.
    Evidencia: 19 pruebas WASM nuevas (dos pthread), batería dirigida de 330 y
    baterías heredadas de 39 y 74, sin skips.
  - [x] **A6-04.d — Terreno nativo.** Altas/reemplazos de asentamientos y lotes
    propuestos sin publicación; comparación de vértices y sólidos canónicos,
    preflight de apoyo actual y revocación de futuros dependientes. Implementado
    y validado en Desierto. Cambiar el apoyo de un cuerpo vivo se rechaza, no se
    transporta verticalmente de forma implícita; la política exterior sigue
    pendiente. Evidencia: 14 pruebas WASM nuevas (dos pthread), batería dirigida
    de 344 y baterías heredadas de 39 y 74, sin skips.
  - [ ] **A6-04.e — Puertas móviles.** Hojas, barrido, apertura/cierre y esperas
    autoritativos; la máscara estática no es suficiente.
    **Parcial:** geometría autorada, reloj de 0,6 s, sensores/espera y política
    nativos implementados como servicio opt-in. Política incompleta congela el
    motor; una propuesta transaccional rechazada conserva el anterior. Barrido
    continuo hoja/cuerpos y candidatos temporales validado mediante
    cotas de distancia/velocidad; preparación atómica y altas/mutaciones de cuerpos
    protegidas hasta la pose final. Barrido adicional opt-in contra muros,
    polígonos, props canónicos y otras hojas; protege el giro restante/pose final
    ante nuevas geometrías y conserva datos residentes. No equivale a clearance
    del mundo completo. El mecanismo marco/hoja y apoyo nativo de la clase
    validada ya está cerrado como e-R1; no certifica apoyos arbitrarios.
    e-R2 cerrado: admisión atómica nativa de la ruta completa, aperturas futuras
    y reservas ligadas al mismo slot/cuerpo, con cierre previo conservado hasta
    la inversión. Suspensión/reanudación del sufijo por eventos, sin planner,
    manteniendo fases/carrera. Los candidatos previos siguen sin admitir; la
    nueva API nativa puede reservar y ejecutar solo tras sus pruebas completas.
    Pendientes conexión con entidades, recuperación/guardado, consecuencias y
    frontera física/gráfica de producto (e-R3/e-R4/f). `authorizedPassage:false`
    sigue indicando que no se activa producto/GPU, no ausencia de admisión nativa.
    Evidencia:
    11 pruebas de política + 12 de barrido + 8 de espera iniciales; 20 nuevas de
    objetos y 2 de coordinación; 13 nuevas de esperas múltiples. Batería actual:
    536 dirigidas + 39 y 74 heredadas
    sin skips. Tres auditorías WASM/WebGPU reproducen espera/reanudación y fases/
    presupuesto desde un único paquete durante dos bloqueos de 500 ms cada una,
    sin nuevas posiciones JS ni trabajo geométrico nativo. Son triángulos de
    diagnóstico; no hay aceptación gráfica de personajes autónomos.
  - [ ] **A6-04.f — Efecto físico/gráfico coordinado.** No hacer efectiva una
    mutación mientras un dibujante pueda cruzar antes de su revocación; depende
    también de A6-06.
    **Parcial:** recibo de retirada del trabajo GPU previo por canal directo,
    separado del ACK de recepción del control. Época/sesión/secuencia/tiempo e ID
    exactos; fallo, timeout o retiro no conceden recibo. Tres auditorías WASM/WebGPU
    reales mantienen 15 dibujos y reciben el fence durante bloqueo de preparación
    de 500 ms. Es diagnóstico con triángulo, no personajes ni permiso de mutación.
    Propuesta de motor nativa pendiente + commit condicionado al recibo ya
    disponibles opt-in, con ticket de un uso y rechazo si cambian cuerpos, hechos,
    reservas, mundo, reloj o conexión. Quince pruebas WASM adicionales y cuatro
    auditorías nuevas WASM/WebGPU: tres commits y un rechazo por cambio de cuerpo
    durante la espera, todas con 15 dibujos durante 500 ms de bloqueo.
    El modo de objetos también participa en staging/commit: otras cuatro
    auditorías reales verifican tres certificados/vetos de geometría posterior y
    un rechazo por obstáculo introducido durante la espera, sin repetir clearance.
    f-R1 cerrado para el cohort nativo: fronteras de tiempo finitas desde ejecución,
    pausa/velocidad/revocación directas y replay GPU que no sobrepasa lo ejecutado
    ni rebobina. Prueba real con un paquete, tres bloqueos de 500 ms, recibo GPU
    durante preparación bloqueada y readback de fases/posición contra WASM.
    f-R2 cerrado en el dominio nativo actual: overlays, residencia (incluido
    pthread), props y terreno con propuestas no efectivas y commit condicionado.
    Invalida paquetes anteriores y conserva congelada la imagen hasta recursos
    nuevos. No instala recursos de puerta ni activa cruces de producto. Faltan
    coordinación completa de
    consumidores/relevo e integración física/gráfica de producto con personajes.
- [ ] **A6-05 — Todas las intenciones, perfiles y biomas.** Completar animales
  (entrada, ataque, objetivo, retirada) y trabajadores (tareas, entrega/carga,
  regreso/huida, recuperación), además de impactos/ragdoll delimitados. La
  prueba estática continua actual sigue limitada a Desierto.
- [ ] **A6-06 — Reloj causal y aplicación física/gráfica.** Coordinar avance,
  pausa, velocidad, comandos, revocación y ACK. Existen el log versionado y el
  canal independiente; f-R1 ya resuelve la frontera del cohort nativo opt-in.
  Faltan aplicación física/gráfica de las mutaciones, todos los consumidores,
  recuperación e integración del producto; este punto principal no se cierra.
- [ ] **A6-07 — Pérdida de canal y recuperación.** Desconexión silenciosa,
  retrasos, sustitución de Workers y recuperación gráfica sin permisos inseguros
  ni resurrección de generaciones.
- [ ] **A6-08 — Personajes con planes completos en GPU.** Posición, orientación,
  altura y animación autorizadas, admisión segura tras esperas de recursos y sin
  publicaciones periódicas de posición JS necesarias para locomoción.
- [ ] **A6-09 — Aceptación integrada real.** WASM/WebGPU con animales y
  trabajadores: obstáculos, tráfico, puertas, bloqueo síncrono de preparación
  de 500 ms, pausa/velocidad, acciones, guardado/restauración y device loss.
  Verificar mecánicas y determinismo; documentar/reproducir fallos heredados.
- [ ] **A6-10 — Costes estructurales.** Medir separadamente planificación,
  validación, contactos, preparación, dibujo CPU y GPU, comparando locomoción sin
  eventos con cambios estructurales. Los contadores nativos son evidencia
  parcial, no una medida integrada de rendimiento.
- [ ] **A6-11 — Activación y retirada de duplicados.** Activar clases validadas en
  producto y retirar planners/ejecutores/guardas JS redundantes; conservar solo
  excepciones justificadas y auditar los puntos anteriores antes de cerrar A6.

## Evidencia y siguiente avance

- [Objetivo y orden obligatorio](MIGRATION-OBJECTIVE.md).
- [Arquitectura, incrementos y límites](intent-route-architecture-correction-20261108.md).
- `.cache/native-residency-regression.tap`: 311 aprobadas sin skips.
- `.cache/native-residency-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-props-regression.tap`: 330 aprobadas sin skips.
- `.cache/native-props-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-props-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-terrain-regression.tap`: 344 aprobadas sin skips.
- `.cache/native-terrain-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-terrain-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gates-regression.tap`: 355 aprobadas sin skips.
- `.cache/native-gates-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gates-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gate-sweep-regression.tap`: 367 aprobadas sin skips.
- `.cache/native-gate-sweep-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-sweep-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gate-waits-regression.tap`: 375 aprobadas sin skips.
- `.cache/native-gate-waits-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-waits-legacy-recipe.tap`: 74 aprobadas sin skips.
- `.cache/native-gpu-fence-regression.tap`: 382 aprobadas sin skips.
- [Tres recibos GPU reales](performance/native-control-gpu-fence-20261109.json).
- `.cache/native-gate-transactions-regression.tap`: 397 aprobadas sin skips.
- `.cache/native-gate-transactions-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-transactions-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Transacción de motor y rechazo tras cambio de cuerpo](performance/native-gate-transactions-20261109.json).
- `.cache/native-gate-objects-regression.tap`: 419 aprobadas sin skips.
- `.cache/native-gate-objects-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-objects-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Certificados de objetos y rechazo tras obstáculo nuevo](performance/native-gate-objects-20261109.json).
- `.cache/native-gate-multiwaits-regression.tap`: 432 aprobadas sin skips.
- `.cache/native-gate-multiwaits-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-multiwaits-legacy-recipe.tap`: 74 aprobadas sin skips.
- [Tres replays GPU de espera intermedia y reanudación](performance/native-gate-multiwaits-20261109.json).
- `.cache/native-gate-mechanism-regression.tap`: 446 aprobadas sin skips (incluye 9 nuevas de mecanismo y 5 de render antes separadas).
- `.cache/native-gate-mechanism-legacy-stream-geometry.tap`: 39 aprobadas sin skips.
- `.cache/native-gate-mechanism-legacy-recipe.tap`: 74 aprobadas sin skips.
- Incremento previo de e-R2: `.cache/native-gate-crossings-regression.tap`, 462 aprobadas sin skips, incluidas 16 de admisión/reservas. `.cache/native-gate-crossings-legacy-stream-geometry.tap` (39) y `.cache/native-gate-crossings-legacy-recipe.tap` (74), también aprobadas sin skips. Aún no cerraba e-R2 ni acreditaba personajes/GPU.
- Incremento de suspensión/reanudación de e-R2: `.cache/native-gate-resume-regression.tap`, 474 aprobadas sin skips, incluidas 12 de sufijos/offsets. `.cache/native-gate-resume-legacy-stream-geometry.tap` (39) y `.cache/native-gate-resume-legacy-recipe.tap` (74), también aprobadas sin skips. En ese incremento quedaba pendiente la composición con cierre en curso.
- Cierre de e-R2: `.cache/native-gate-e-r2-regression.tap`, 479 aprobadas sin skips; `.cache/native-gate-e-r2-legacy-stream-geometry.tap` (39) y `.cache/native-gate-e-r2-legacy-recipe.tap` (74), aprobadas sin skips. [Registro de aceptación nativa](performance/native-gate-crossing-resume-20261109.json); se reproduce con `tests/spatial-native-gate-route-acceptance.test.js`.
- Cierre de f-R1: `.cache/native-causal-clock-regression.tap`, 493 aprobadas sin skips; `.cache/native-causal-clock-legacy-stream-geometry.tap` (39) y `.cache/native-causal-clock-legacy-recipe.tap` (74), aprobadas sin skips. [Aceptación WASM/WebGPU del reloj causal](performance/native-causal-clock-20261109.json), reproducible en `/tests/browser/native-causal-clock.html`; diagnóstico, no personajes.
- Avance parcial de f-R2: `.cache/native-barrier-quiescence-regression.tap`, 517 aprobadas sin skips; `.cache/native-barrier-quiescence-legacy-stream-geometry.tap` (39) y `.cache/native-barrier-quiescence-legacy-recipe.tap` (74), aprobadas sin skips. [Una barrera WASM/WebGPU con preparación bloqueada](performance/native-barrier-mutation-20261109.json), reproducible en `/tests/browser/native-barrier-mutation.html`. No cierra f-R2 ni acredita personajes/recursos nuevos.
- Cierre de f-R2: `.cache/native-world-mutations-regression.tap`, 536 aprobadas sin skips; `.cache/native-world-mutations-legacy-stream-geometry.tap` (39) y `.cache/native-world-mutations-legacy-recipe.tap` (74), aprobadas sin skips. [Seis mutaciones WASM/WebGPU](performance/native-world-mutations-20261109.json), reproducibles en `/tests/browser/native-world-mutations.html`. No son aceptación gráfica de recursos nuevos/personajes.
- [Mecanismo nativo y mallas reales WebGPU](performance/native-gate-mechanism-20261109.json) · [captura](performance/native-gate-mechanism-20261109.png).

Quedan **2 de los 6 subpuntos de A6-04**: e y f (parciales).
Dentro de su desglose fijo quedan **3 de 8**: e-R1/e-R2/f-R1/f-R2/f-R3 cerrados; e-R3/e-R4/f-R4 pendientes.
Los **11 puntos principales de A6** siguen abiertos; son niveles distintos,
no dos cantidades que deban sumarse.

Próximo trabajo de A6-04: puertas móviles (A6-04.e) y coordinación de efecto;
en paralelo de dependencias de diseño,
siguen pendientes la integración de entidades/fases/consecuencias (A6-01/02) y
la coordinación temporal con dibujo (A6-06). No se declara completa la suite
general ni la aceptación real A–F.

Avance parcial f-R4 (13 de noviembre): [propuesta y consumo del delta gráfico real](f-r4-prepared-terrain-delta-20261113.md). El mismo surface/dispositivo conserva los buffers del chunk sin cambios; no reconstruye otra escena en este ensayo. Preparación bloqueada 500,7 ms con 15 dibujos estacionarios antes del efecto. Permanecen la regeneración nativa dentro del hold (39,9 ms), el fallback tras frame obsoleto y la integración/aceptación con personajes autónomos. Sin cambios en los recuentos de cierre.

Avance parcial f-R4: [commit nativo de la adición preparada](f-r4-native-prepared-commit-20261113.md). Reutiliza receta, rasters y sectores tras revalidar perfil/grafo; proyección desde buffers propios sin regeneración. Readmisión medida: 1,6 ms tras drenaje frente a 39,9 ms anteriores, con el mismo surface. Paridad canónica de seis biomas/seis perfiles y 902 pruebas aprobadas. No cierra otras familias, el rechazo de frames ni la integración/aceptación con personajes autónomos.

Avance parcial f-R4: [continuación de un rechazo nativo preparado sobre los mismos recursos](f-r4-frame-continuation-20261113.md), con patrones contrastados en fuentes de Babylon/Three. Dos rechazos reales en tránsito, Workers de producto y mismo dispositivo/propietario, 93 buffers compartidos y uploads retenidos usados sin reenvío. Cierre/drenaje y 914 pruebas aprobados. No cierra la autoridad normal, todos los casos de recuperación ni la aceptación con locomoción; recuentos sin cambios.

Avance parcial f-R4: [retención de terreno en revisiones de props](f-r4-unchanged-terrain-20261113.md), contrastada con fuentes de Three/Godot. Eliminación/restauración nativa real conserva geometría, material, máscara y los cuatro buffers de terreno en los chunks afectados, con el mismo dispositivo, sin errores GPU y con drenaje al cerrar. Props todavía se preparan por chunk y su commit/proyección nativa tarda 14–18 ms en el ensayo; quedan esas familias, autoridad normal y aceptación de locomoción. No cambian los cierres.

Avance parcial f-R4: [instalación nativa de props preparados](f-r4-native-prepared-props-20261113.md), contrastada con Detour/Godot. Supresión/restauración protegida conservan rasters/sectores/candidatos antes del hold y los instalan en el orden canónico. En el harness GPU, commit/proyección baja de 14,2/18,2 ms a 0,9/1,3 ms, sin recetas nuevas durante commit y conservando terreno/dispositivo. Quedan reutilización gráfica de instancias, terreno y otras familias, autoridad normal y aceptación; no cambian los cierres.

Avance parcial f-R4: [retención de slots de props](f-r4-retained-biome-slots-20261113.md), con patrones consultados en el código de Three/Godot. La admisión conjunta valida grupos nuevos y conservados antes del commit; rollback/retirada afectan solo a los lotes sustituidos. En GPU real se conservan 6/16 meshes y sus buffers; preparación de props pasa de 278/785 ms a 11/170 ms en el fixture. Quedan streams dentro de slots modificados, terreno, otras familias, autoridad normal y aceptación. No cambian los cierres.


Continuación parcial f-R4, 14 de noviembre: [Carry nativo y parámetros de ruta como datos](f-r4-native-carry-20261114.md). Caja de nueve piezas y cuerpo comparten fases C++, conservan rig/geometrías y admiten Walk ↔ Carry antes del relevo. GPU real: 15 dibujos durante 500 ms, cero fábricas en el primer render y drenaje al cerrar. La preparación de un relevo baja de 22 a 12 pipelines al retirar constantes de ruta del shader; quedan 213 buffers y 108 pares de bind groups/layouts, sin aceptación de reutilización completa. Siguen pendientes productor/ejecución ordinarios, Idle/puerta/acción, consecuencias e integración A–F/B/C. No cambian los cierres.


Continuación parcial f-R4, 14 de noviembre: [materiales de la variante nativa utilizada](f-r4-native-selected-materials-20261114.md). El binder y la admisión conservan fuentes CPU y clips ocultos al preparar el relevo. Carry en GPU real reduce 213 a 90 buffers, 108 a 48 pares de bind groups/layouts y 12 a tres pipelines; primer render sin creaciones, geometrías y drenaje conservados. Quedan tres sombras idénticas recreadas y el resto del presupuesto, además de fases/ejecución ordinarias y aceptación integrada. Se documenta el patrón de material fuente de Three para la siguiente corrección; ningún cierre cambia.


Continuación parcial f-R4, 14 de noviembre: [sombras por material fuente](f-r4-native-shadow-source-20261114.md). Se adapta el código real de Three 253fa7ad al parche r180 existente: identidad/versión/listener del material fuente y ChainMap por longitud. El relevo Carry equivalente pasa de tres a cero shaders/pipelines nuevos, manteniendo primer render sin creaciones, nueve piezas, dibujo durante bloqueo y drenaje. Permanecen 90 buffers y 48 pares de bind groups/layouts nuevos, fases y autoridad ordinarias e integración A–F/B/C; no cambian los cierres.


Continuación parcial f-R4, 14 de noviembre: [Idle durante esperas nativas](f-r4-native-idle-20261114.md). El selector de la misma malla consume Idle/Run/Walk del reloj C++ finito; Carry conserva su fase y caja en el hold. El relevo retiene los clips ya admitidos para reutilizar programas. La prueba GPU de una espera nativa registra cuatro dibujos detenidos y once posteriores durante 500 ms, sin cambios CPU y sin shaders/pipelines nuevos al relevar. Falta conectar el dibujo de la hoja de puerta al mismo estado nativo, además de fases/acciones y autoridad ordinarias e integración A–F/B/C. No cambia ningún cierre.


Continuación parcial f-R4, 14 de noviembre: [comandos retenidos antes del commit físico](f-r4-prepared-world-commands-20261114.md). La captura C++ copia los motores de las puertas reservadas; Settlements y el roster admiten el grupo con los tickets existentes. Malla/atributos conservados, giro GPU y entrada con tiempo consumido. Walk/Idle y Carry mantienen 15 dibujos durante 500 ms, primer render sin fábricas y relevo sin shaders/pipelines nuevos. Retiro gráfico del actor conserva la hoja y su selección; no prueba el retiro lógico C++ ni el motor sin intenciones. Siguen pendientes propuestas/commit del motor con recursos preparados, productor/ejecutor ordinarios y aceptación A-F/B/C; no cambian los cierres.

### Continuación 2026-11-14: motor preparado sin actor

[motor de puerta preparado e independiente del actor](f-r4-prepared-gate-motor-20261114.md). La propuesta C++ captura recursos antes de quiescencia/commit y publica el marcador común. La puerta usa ese marcador y el reloj causal directo, sin retener la asignación. Walk/Idle y Carry prueban cierre con cero trabajadores durante otro bloqueo confirmado de 500 ms, geometría conservada y primer render sin fábricas. El ejecutor causal admite un conjunto vacío coherente sin saltarse pausa. Siguen abiertos retirada lógica preparada, feed ordinario de rutas, consecuencias y aceptación A/B/C; no se añade ningún cierre.

### Continuación 2026-11-14: comandos retenidos

[comandos retenidos antes del commit físico](f-r4-prepared-world-commands-20261114.md). El consumidor prepara uploads y retiene comandos/versiones antes del efecto; quiescencia exige ese candidato a cada miembro del cohort y el marcador exacto lo adopta sin otro turno del preparador. Walk/Idle y Carry prueban commit e imagen nueva dentro de un bloqueo de 1.500 ms, 45 dibujos y geometría/pipelines conservados. Se separan las texturas CPU retenidas con sus mips/vistas. Productor ordinario, otras mutaciones, nuevas asignaciones y retirada lógica preparada siguen pendientes; ningún padre A6 ni e-R3/e-R4/f-R4 se cierra.
