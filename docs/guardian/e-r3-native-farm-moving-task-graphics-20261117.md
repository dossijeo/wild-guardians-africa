# Actor original en Farm retenido → Task

Continúa el [control y la admisión Farm→Task](e-r3-native-farm-moving-task-control-20261117.md) en el siguiente punto del [plan principal](integrated-gpu-migration-plan-20261104.md): el roster acepta la fuente Farm23 detenida por24 para preparar TaskStart14 sobre el actor residente. Conserva raíz, mallas, geometrías, índices y bancos de clips. La integración específica del relevo con Surface/Host y hardware queda pendiente; estas pruebas usan renderer, admisión y testigo presentado simulados. A6/A/B/C abiertos; D no iniciado.

## Código consultado y decisión

Antes de implementar se inspeccionan [`Mesh.copy` de Three r180](https://github.com/mrdoob/three.js/blob/r180/src/objects/Mesh.js#L112) y [`SkeletonUtils.clone`](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/utils/SkeletonUtils.js#L388). El primero comparte geometría y referencias de materiales; el segundo remapea los huesos del esqueleto clonado a la jerarquía correspondiente. No se requiere clonar otro actor para cambiar su trayectoria. Se adapta la sustitución de variante y binding que ya usaba Idle→Task, conservando el actor y sus bancos. No hay dependencia nueva ni otro registro de propietarios.

## Continuación exacta del cuerpo Farm

La comprobación pura del sucesor Task comparte ahora las dos familias detenidas explícitas. Farm conserva su clase y obtiene el perfil de su petición23; Idle conserva el perfil de su referencia22. Se comprueban actor, cuerpo, época, sesión, secuencia, tiempo, radio, origen, fases y presupuesto retenidos. No se trata Farm como un Idle ficticio ni se habilita Home.

El propietario detenido admite la cancelación semántica de una asignación Task ordinaria: `waiting-task`, solicitud pendiente de recursos, tarea realmente asignada al mismo trabajador y campos de camino/cancelación esperados. Sólo normaliza esos campos frente a la política de la parada; mantiene fijados pose final, heading, contrato, centro, perfil y demás datos. Un marcador por sí solo no concede propiedad. La prueba final24 y su proyección continúan siendo necesarias para obtener la fuente Farm retenida.

La nueva variante puede activarse y deshacerse sin invalidar el cuerpo detenido que la respalda. Durante preparación hay dos propietarios de movimiento: el retenido y la nueva tabla de Task. Al adquirir14 se retira el primero mediante el mecanismo existente; cancelar elimina únicamente el candidato. La raíz y las geometrías permanecen idénticas. La nueva trayectoria sí necesita sus propios datos; los bancos de animación compartidos no cambian.

## Validación y límites

Los21 casos nuevos cubren cuatro perfiles caminando/corriendo en Farm, rollback, adquisición posterior al final de la antigua llegada, cancelación, retirada y cambios de pose/heading/contrato/perfil/target. Incluyen retarget temporal sin duplicar propietarios, rechazo de una asociación nativa alterada, pthread y picking ordinario antes y después del relevo sobre la misma raíz. El test de picking proyecta la ejecución nativa actual y muestrea la silueta animada; no representa una captura de hardware.

Los shaders reales de Three para color y sombra compilan con la referencia Task14 correcta y con las texturas originales de los bancos. Se conservan los mismos arrays y versiones. Los contadores de adquisiciones de los helpers Farm se consultan mediante getters para comprobar el valor actual, en lugar de copiar su valor al construir el fixture.

La prueba previa falla en los cuatro perfiles porque el roster sólo reconoce el origen Idle. El control negativo de lectura elimina exclusivamente la comparación de pose en la normalización Task: el roster acepta entonces una pose confirmada alterada y el test falla por ausencia del rechazo esperado. No modifica el árbol ni los WASM. Los primeros ensayos ampliados identificaron errores del arnés: nombre del callback de retarget, ubicación de la referencia canónica, revalidación antes del commit tardío y muestreo de picking; la evidencia conserva esos logs y distingue la validación final.

La [evidencia verificable](performance/native-farm-moving-task-graphics-validation-20261117.json) recoge los inputs congelados, las pruebas dirigidas, la regresión seleccionada, el build y las preservaciones. No se recompila C++; los64 inputs/artefactos nativos son los del incremento de fuente Farm→Task. Se mantienen los16 archivos locales ajenos, el worker pthread sin seguimiento y los bytes anteriores de los cuatro documentos principales. Los siete fallos históricos fuera de la selección siguen abiertos.

Quedan la adopción Farm→Task en Surface/Host y GPU real, Home, finales, cohort/productor completos, guardado y recuperación. Las mediciones históricas de641 IDs conservados/0 recursos tardíos pertenecen a Farm24, con intervalos64,27/86,81 ms todavía abiertos; no son mediciones nuevas del relevo14. La recuperación incremental de los3.123 recursos y la ausencia de tirones no están acreditadas. Continúa A/A6 → B1–B7 → C antes de D.
