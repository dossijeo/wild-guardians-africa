# Continuación preparada de Farm desde una parada real

El caso pendiente de 9f22a331e queda resuelto: si desaparece la tarea elegida después del commit24 y antes de reclamarla, el trabajador conserva su cuerpo y puede adquirir otra Farm23 desde la pose retenida hacia su intención original. El productor selecciona esta continuación después de el arbitraje ordinario de tareas; Task y Home mantienen prioridad. El roster Farm ordinario de SourceAuthority sigue cerrado.

## Referencias y decisión

Se consultó código real de Detour v1.6.0: [DetourPathCorridor.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourPathCorridor.cpp), especialmente movePosition, moveTargetPosition, setCorridor y dtMergeCorridorStartMoved; también requestMoveTarget/Replan, resetMoveTarget y updateMoveRequest de [DetourCrowd.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp). El patrón aprovechado conserva agente, posición y destino mientras actualiza o replantea el trayecto. Wild reutiliza su consulta nativa, reservas y adquisición Farm23; no incorpora el corredor de Detour ni una dependencia, reloj, cola o propietario nuevos.

La reanudación genérica9 permitía mover una Farm detenida sin preservar su asociación tipada. Se cierra ese acceso para Farm; la continuación exige sus recursos preparados23. No se declara otra petición13, ni se inventa Idle, Task o Home.

## Implementación

La fuente original mantiene el destino y la procedencia. Una referencia opcional y plana sourceHeld identifica secuencia, handle de reanudación, momento de parada y pose física real, con yaw, radio, fases y presupuesto. No contiene un enlace a la referencia anterior; las paradas repetidas mantienen metadatos acotados. El candidato retiene su asociación exacta solo mientras prepara; el binding publicado conserva el valor plano.

Stage/revalidate/commit comprueban el propietario retenido actual, elegibilidad, generación, slot, cuerpo, perfil, centro, reservas y reloj. La nueva ruta se consulta desde la pose nativa retenida, conserva fases/presupuesto y usa el mismo slot y cuerpo. El único export añadido devuelve ese origen por el scratch de ejecución existente. Cancelar o preparar no mueve el cuerpo. Una petición Home válida invalida solo la continuación pendiente de esa misma Farm después de verificar su fuente; un Home inválido no cancela el candidato.

El controlador admite la continuación únicamente desde su parada24 instalada con proyección final; guarda la fuente plana y exige el evento, reloj y asociación23 exactos. La Surface reutiliza el actor/rig, geometría, índices, instancias y bancos; el reemplazo de variantes/bindings y su retirada pasan por las funciones existentes. Game proyecta el nuevo binding desde el marcador retenido y mantiene arriving, sin ejecución JS. El productor deriva la fuente del estado actual y de el arbitraje de tareas, excluye executedThrough de su identidad y aborta las preparaciones obsoletas.

## Validación

Baseline: 46 casos fallaban antes de la API y el guard genérico. La primera ejecución funcional observada dio 30/46; se corrigieron el ticket de parada repetida del test y el bloqueo real de Home por una propuesta23 pendiente. La ejecución intermedia archivada, antes de recompilar Home, pasó 38/46. Los ensayos de puertos detectaron que el baseline debía conectarse antes de adquirir/detener Farm: no se relajó el rechazo de una conexión tardía. Los ocho controles gráficos inicialmente fallaban; se reutilizó el contrato de reemplazo tipado y se corrigió el etiquetado de frontera del fixture raw como en los fixtures anteriores.

Los 75 casos nuevos en cinco archivos pasan: cuatro perfiles y ambos WASM, preparación/cancelación/revalidación tardía, movimiento del peer, Task/Home durante preparación, metadatos acotados tras paradas repetidas, fuentes falsificadas, reanudación genérica cerrada, controlador, puertos, productor y retirada posterior a24. Los callbacks gráficos/GPU de los fixtures CPU son dobles explícitos.

La selección final termina 4628/4629, 353 archivos, cero fallos y una comparación WASM opcional omitida. Las tres exclusiones históricas de host/timeline siguen abiertas y no se repiten. Pasan 16 sintaxis y el build WebGPU/Worker con dibujo remoto, 57.251 s. Standalone/pthread se reconstruyen con flags/exports de la receta canónica y outputs aislados; cambian ambos WASM y el JS pthread por el export añadido, con worker idéntico. Se fijan 633 inputs probados, 64 nativos y 16 ajenos intactos.

La captura hardware nvidia/turing completa Farm23→24→23 sobre Surface, puertos y Host reales: 645 IDs inmutables retenidos, una textura de movimiento sustituida, 70 recursos preparados y 0 después de READY, 0 shaders idénticos recompilados, picking, adopción 5/ready y drenaje. Registra 54/54 dibujos durante los dos bloqueos de 1800 ms; timing sin PNG. Su fuente es de componente con un peer Home explícito: no acredita el productor ordinario en navegador ni cadencia global.

## Base externa y siguiente punto

Se verifican y adoptan las 38 rutas de los commits independientes A5 26ed02f0c y38012c437, sin atribuirlos a esta implementación. Base inicial 9f22a331e; base publicada previa 38012c437. El auditor cedido queda en 930f526fbfb1461c8f4add4e89d8f502679a91016f9bc6fd75961f546850693e. [Informe A5](a5-resource-ownership-20261119.md) y [traspaso](a5-resource-lab-handoff-20261119.md) conservan evidencia válida y piloto rechazado; no cambian producción ni cierran gates. Sus resultados de laboratorio son evidencia independiente, no parte de los 75 casos nuevos ni de esta captura Farm.

Siguiente: conectar la preparación inicial Farm13→23 y su Idle terminal en el productor ordinario, y validar el ciclo completo antes de abrir el roster correspondiente. Siguen pendientes nacimientos/cohortes restantes, independencia de nuevas admisiones del lote, consumidor/cohort fallido, pérdida de dispositivo, coste de publicación pausada, autonomía VFX, coste inicial, cadencia y plataformas. A6/A/B/C permanecen abiertos; D no iniciado; f-R3 conserva su seguridad.

[Recibo y evidencias](performance/native-farm-held-continuation-validation-20261119.json).
