# Productor restaurado con autoridad y consumidor originales

Continua el [productor de cohortes restauradas](e-r3-native-intent-production-restoration-20261117.md). El recorrido usa ahora el Worker ordinario de autoridad, Game/WASM, su publicador de terreno, WorldSurface, roster, ambos puertos independientes y el Worker de dibujo WebGPU real. Corrige dos dependencias ocultas por las verticales anteriores. Es un avance de e-R3; no cierra A6/e-R3/e-R4/f-R4/A/B/C ni inicia D.

## Referencias de implementacion y decisiones

- [Godot 4.4, `NavigationAgent3D::get_navigation_map` / `set_navigation_map`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp#L509): consulta el mapa del propietario actual, conserva su identidad y solo cambia la asociacion cuando corresponde. Se adapta la consulta del publicador existente: el Worker proporciona `terrainPublication.manifest()` a la autoridad. No se crea otro mapa, replica de revisiones ni fuente de terreno.
- [Detour 1.6.0, `dtCrowd::updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L677): valida el corredor actual antes de incorporar el resultado asincrono. El manifiesto acompana una sola transaccion existente; la validacion de soporte y revalidacion nativa siguen decidiendo si es vigente. No se importa un planner nuevo.
- Codigo instalado de Three r180, `src/renderers/common/Bindings.js::_update` y `Renderer.js::compileAsync`: conserva bindings sin cambios y prepara los pipelines del objeto solicitado. Se mantiene esa admision independiente para los efectos nuevos; no se precalienta una escena completa ni se vacian caches para obtener un contador artificialmente uniforme. Los hashes de los fuentes consultados constan en la evidencia.

## Correcciones

La primera propuesta Home genuina encontraba `terrainSupport === null`: antes se inicializaba incidentalmente por la ruta legacy usada para el companero de las verticales. WorldSurface inicializa ahora el mismo servicio al preparar recursos nativos. No necesita una ruta o publicacion ficticia para hacerlo.

El productor tampoco enviaba el manifiesto del terreno real. La autoridad recibe un getter del publicador que ya posee el Worker. Sin ese propietario espera una frontera real; no fabrica revisiones. Obtiene el manifiesto una sola vez por despacho y lo transmite mediante las opciones existentes de preparacion. La nueva prueba verifica espera, despertar y transmision exacta. Los fixtures de Host determinista declaran expresamente su manifiesto simulado; esa prueba no sustituye la validacion de soporte de WorldSurface.

## Recorrido reproducible

`QA_NATIVE_ORDINARY_PRODUCTION=true` en `tools/guardian/audit_native_first_task_world_owner.mjs` reutiliza el checkpoint semantico WALK genuino de la vertical anterior. Esa construccion termina antes de crear la autoridad nueva. Desde ahi solo hay comandos ordinarios por su cliente: ninguna llamada del arnes al ABI ni avance local de fisica.

El checkpoint de desierto contiene dos trabajadores de perfil youngMale, sin raid ni puertas, con Home pendiente B y WALK restaurado A. El productor admite Home y, mientras prepara A, B avanza en Game. El publicador real entrega los chunks por bootstrap. La presentacion utiliza el sender existente con ACK/coalescencia: no se envian snapshots sin reconocimiento mientras Surface retiene una publicacion.

El arnes retiene una respuesta READY autentica, la reenvia sin modificar y bloquea el preparador durante 1800 ms. La autoridad admite A y el consumidor adquiere el paquete con ambos programas nativos durante ese bloqueo. Comprueba fase/pose/presupuesto conservados antes de admitir, RNG, avance independiente, bindings nativos, reloj consumido, picking, propietarios originales y ausencia de retiros de recursos residentes. El cierre exige observar el recibo `disposed:true` emitido por el Host despues del drenaje; conserva viva la autoridad hasta entonces.

## Resultado y limite de fluidez

[Evidencia, hashes y validaciones](performance/native-intent-production-world-owner-validation-20261117.json). La ejecucion final en NVIDIA/Turing conserva **569 IDs** de buffers de geometria y texturas residentes, sin retiros de ese conjunto. Conserva las raices, huesos y mallas originales, el propietario grafico y el hash CPU del rig entre READY y adopcion. El picking devuelve ambos trabajadores. Durante la primera espera hay 87 publicaciones confirmadas y 54 dibujos; durante el bloqueo posterior hay 53 dibujos del paquete adquirido y 1,68 s de avance del reloj. No hay errores de GPU, consola o recursos y el drenaje queda confirmado.

La preparacion de las dos primeras admisiones crea 300 recursos de protocolo. **No es un recorrido de cero asignaciones de escena:** despues de READY aparecen 30 recursos nuevos correspondientes a la primera demanda de pisadas: atlas, datos muestreados, buffers, bindings y pipelines. La traza identifica los buffers `wgFootstepSlot`/`iPos` del efecto. No son reconstrucciones de actores o terreno sin cambios. Otra ejecucion observo solo dos recursos tardios porque la carga del efecto se solapo de otra manera. No se fija ni se permite por nombre un contador de 30 en la prueba; se registra el trabajo y se mantiene estricta la conservacion del conjunto residente.

Los contadores de fabricas dentro de los renders inspeccionados son cero, pero esto **no demuestra ausencia de tirones**. La ejecucion final registra un intervalo global de **119,23 ms** durante bootstrap y **66,80 ms** al primer paquete adquirido. La espera anterior registra un maximo de 33,45 ms. La duracion maxima registrada de un trabajo de recursos es 19,51 ms. Estos datos no prueban una causa comun ni sustituyen los picos historicos 85,62/41,01 ms. Se conserva abierta la continuidad C, incluida la primera aparicion y autonomia de las pisadas; no se desactivan sus efectos para aprobar la prueba.

La regresion de 76 archivos termina con **649 pruebas aprobadas de 650**, cero fallos y una comparacion opcional de cache nativa omitida expresamente porque exige ambos binarios candidatos. La suite dirigida de autoridad pasa sus 15 casos, uno nuevo. El build de producto termina correctamente en 57,34 s y pasan cuatro comprobaciones de sintaxis de arnes/runner. Los 62 inputs/artefactos nativos no cambian, sin reconstruir WASM; los 16 archivos locales protegidos y el Worker no registrado conservan sus bytes. Los siete fallos previos de dos suites ajenas a esta seleccion no se presentan como corregidos.

## Siguiente pendiente

Este ensayo acredita el productor restaurado en ese dominio y detecta los limites anteriores. Quedan llegada inicial a granja, demas origenes/finales, cohortes mixtas, puertas/raid, cambios de contrato/roster, parada automatica de WALK hacia Task/Home y guardado de interfaz. La recuperacion incremental integral de los 3123 recursos sigue pendiente: este ensayo conserva recursos en el mismo dispositivo y no simula su perdida. Los siete fallos previos documentados permanecen abiertos para C. Primero se completan esos criterios de A y despues la aceptacion B1-B7/C; no se sustituye la arquitectura ni se anade dependencia.
