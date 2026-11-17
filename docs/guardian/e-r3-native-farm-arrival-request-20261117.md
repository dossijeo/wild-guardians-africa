# Fuente nativa de llegada a la granja

Continua e-R3 despues de la [integracion del productor restaurado en Workers/GPU originales](e-r3-native-intent-production-world-owner-20261117.md). La llegada sin tarea asignada todavia usa `walkTo` en Game. Este incremento incorpora su fuente semantica al propietario nativo de intenciones; no activa esa clase en Game ni declara terminada su ruta o admision grafica.

## Implementacion de referencia y adaptacion

Se consulta el codigo de [Godot 4.4, `NavigationAgent3D`](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp): `get_next_path_position`, `_is_target_reachable` y `_is_within_target_distance`. El objetivo y su distancia de llegada son datos distintos del resultado de la consulta de ruta. Tener un objetivo no implica haber alcanzado su destino ni disponer de un corredor ejecutable.

Se adopta esa distincion sobre las piezas existentes de Wild Guardians. La nueva fuente `NativeFarmArrivalResourceRequest` deriva de `NativeWorkerPoseResourceRequest` y vive en el mismo `ActiveIntent`. Conserva el centro, su punto de servicio nativo, la pose, fases, presupuesto de carrera y perfil reales. La tolerancia de dos metros procede de la condicion `nearEntrance` actual de Game; no se introduce una tolerancia o politica nueva. La llegada futura tambien debera probar el segmento y la ocupacion, como exige esa condicion existente. Este incremento solo declara el objetivo; no implementa todavia esa prueba de llegada ni cambia el movimiento de producto.

No se crea tarea, Home, Idle inicial, corredor, reloj, cola, registro de cuerpos o dependencia. Se reutilizan el estado `AwaitingResources`, la secuencia de transiciones, el vinculo fisico y las barreras de mutacion existentes. El consumidor posterior tendra que preparar y adquirir una ruta propia de llegada antes de conceder movimiento.

## Fuente y ciclo de vida

`nav_intent_request_farm_arrival` exige un trabajador elegible sin tarea, un centro operativo con punto de servicio conocido y metadatos finitos. Una declaracion fria puede preceder al cuerpo; no aparece como peticion vinculada ni permite comprometer un reloj coherente hasta que se vincula el cuerpo exacto. La primera vinculacion emite una secuencia nueva y conserva pose/fases/objetivo; repetirla no crea otra peticion. Cambiar de cuerpo se rechaza.

Con un cuerpo ya vinculado, la peticion conserva su propietario mientras un companero con TaskStart real avanza. Un reintento identico es idempotente; campos diferentes no reescriben el origen. Una propuesta TaskStart de otro actor puede seguir pendiente y revalidarse despues del nacimiento de la llegada. La prueba usa el protocolo nativo ya existente, sin conceder una ruta a la llegada.

El cuerpo pendiente rechaza cambios de posicion, radio, flags o clase. La eliminacion/reset fisicos revocan la fuente mediante los hooks existentes. La lectura contrasta el centro y su punto de servicio actuales: un cambio invalida la fuente anterior e impide usarla para comprometer el reloj. Un lote de tareas no puede sustituir silenciosamente esa fuente; el relevo preparado hacia Task todavia queda pendiente. No se inventa un permiso para hacer pasar esa prueba.

## Validacion y alcance

[Resultados, fuentes consultadas, hashes y limites](performance/native-farm-arrival-request-validation-20261117.json). Las pruebas de declaracion cubren los cuatro perfiles en standalone; la convivencia con un TaskStart que avanza se prueba con youngMale en standalone y pthread reales. Comprueban declaraciones, vinculacion, identidad, retencion fisica, progreso independiente y rechazos. Ambos artefactos nativos se reconstruyen con las nuevas exportaciones. La regresion ampliada de 208 archivos termina con 2004 pruebas aprobadas, cero fallos y una comparacion opcional de cache nativa omitida porque exige otro binario candidato. El build WebGPU termina correctamente en 54 s.

La regresion del productor restaurado se repite en NVIDIA/Turing con los WASM nuevos: conserva 568 IDs residentes, picking y hash CPU del rig, 54 dibujos en cada bloqueo de 1800 ms y recibo real de drenaje. Prepara 300 recursos de protocolo y registra 30 nuevos de pisadas despues de READY. El maximo global es 96,90 ms y el del bloqueo de adopcion 33,47 ms. Esto no demuestra corregidos los picos anteriores ni prueba la llegada nueva en GPU.

Con una cohorte causal activa, el estado de ejecucion Game devuelve expresamente `-1` para esta clase nueva: falta su proyeccion Game, no puede entrar en el mover JS como fallback. La autoridad ordinaria mantiene su admision cerrada. Faltan referencia tipada/publicacion/control, propuesta y revalidacion de ruta de llegada, recursos y recibo grafico, ejecucion/llegada preparada y relevos Task/Home/Idle, guardado y recuperacion. Despues se integrara el origen en el productor existente. El nacimiento semantico no sustituye esos criterios.

La conservacion de recursos y los limites de fluidez del incremento anterior no se convierten en evidencia de una llegada grafica nueva. Siguen abiertos A6/e-R3/e-R4/f-R4/A/B/C, la recuperacion incremental integral de 3123 recursos, los picos de continuidad y los siete fallos anteriores documentados. D no se inicia.
