# REST/WATCH exterior desde 20 en Surface y GPU — 2026-11-19

Continúa `c29132e5a`, e-R3/f-R4. La ruta guardada exterior ya probada en nativo/Game/control/actor llega ahora a la Surface, puertos de recursos/control, Host y NVIDIA reales. Se reutiliza la admisión20 y el audit21→22→REST21 existentes. No cambia producción ni WASM. El cierre de seguridad f-R3 se mantiene; esta entrega no cierra recuperación, e-R3, f-R4 ni A6.

## Referencias y decisiones

Se releyó código real de [DetourCrowd1.6 addAgent/requestMoveTarget](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L511-L627): alta/residencia y solicitud/corredor tienen estados separados. Aquí un guardado semántico requiere otra autoridad y un20 nuevo; ninguna asociación de la fase anterior sobrevive. Se conserva el mecanismo local y no se introduce dependencia, dueño, caché ni ajuste de posición a navmesh.

El primer intento heredaba un checkpoint WALK al 80%, ya dentro del ancla, y el guard lo rechazó antes del mundo gráfico. Se registra el movimiento realmente ejecutado al 20%, como en el audit exterior anterior. Desde esa solicitud real se adquieren21 fallido y sus reintentos finitos hasta REST/WATCH parcial; solo después se usa el guardado público y la autoridad nueva. El setup es de confianza y anterior a GPU, no un permiso gráfico. Dieciséis pruebas cubren 4 perfiles/normal/pthread y ambas fases sin modificar pose ni RNG global.

## Error de comparación aislado y corregido

WATCH pasó20/21 pero el guard anterior rechazó22. Una sonda aislada mantuvo el mismo predicado y registró cada comparación: raíz/huesos/mallas/geometrías, instancias, generación, rig, RNG y GPU eran correctos. Solo cuatro mallas completamente ocultas cambiaban su ID de material; sus geometrías y flags seguían idénticos. Se conserva el fallo, la sonda y el fixture capturado.

Se consultó el código real de [Three r180 Renderer._projectObject](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L2645-L2657), que descarta objetos invisibles, y la proyección `visibleSelection` ya usada en el audit de ciclos. El comparador de WALK aplica esa misma selección: conserva todas las mallas y metadatos, normalizando únicamente el material de las completamente ocultas. Las once pruebas incluyen diez negativos que rechazan cambios de material visible, geometría/ID ocultos, visibilidad, retirada, raíz, huesos, instancias y campos extra. Los guards de recursos físicos, shader duplicado, rig, época, reloj y adquisición permanecen completos. No se cambia el renderer.

## Hardware y recursos

- Cuatro positivos nuevos: REST/WATCH en timing y visual, NVIDIA Turing. Guardado real→autoridad nueva→20→21→22 seleccionado→REST21. El20 y cada asociación posterior se adquieren mediante preparación GPU y protocolo reales, con dos bloqueos de1,8s por etapa, compañero Home independiente, picking, fase y drain.
- Cada recorrido prepara **98/96/98/68** recursos en20/21/22/REST21; **cero creaciones después de READY** y cero shaders duplicados. Dentro de cada captura se conservan **649/650 IDs** físicos inmutables de geometrías/bancos y el mismo actor/raíces/instancias. Son recursos del recorrido concreto; no se presenta esto como solución de la reconstrucción de 3.123.
- La regresión seleccionada anterior también pasa: **100/68/98/68**, cero tardíos y drain. Verifica la rama anterior después de reutilizar el audit con offsets de secuencia/bloque.
- Negativo: omitir exactamente una `nativeIdleCycleTemplate` rechaza21 antes de adquirirlo y conserva el cuerpo 20. El Host falla y la retirada termina en timeout; **no es recuperación ni drain normal aceptados**. El recibo de fallo profundo se conserva junto al20 adquirido, sin que la limpieza lo sustituya por el recibo anterior.

## Validación y cadencia

**27 nuevas,132 seleccionadas/7 archivos y7 comprobaciones de sintaxis pasan**, sin omisiones. Los **482 inputs/64 nativos sin cambios/16 ajenos** coinciden tras las seis sesiones. Solo cambian cuatro archivos QA previos; producción, worker ajeno y compilación nativa permanecen idénticos. La regresión amplia3392/3393 y build46,32s anteriores se referencian como heredados, no repetidos para este cambio de QA. No se solapan tests/build/profiler con hardware.

Se revisan y persisten **16 PNG originales**. Se conservan **7.825 muestras** de las cinco capturas positivas, incluidas las de bootstrap: [frames.json.gz](performance/native-initial-idle-outside-surface-20261119/frames.json.gz). Los registros completos de preparación y consumidores se conservan también en [source-stages.json.gz](performance/native-initial-idle-outside-surface-20261119/source-stages.json.gz). El archivo de frames guarda los objetos completos de frame y las 512 oportunidades finales retenidas por captura; estas últimas no forman un historial completo de callbacks. En 5.916 muestras con reloj/frontera, ninguna se presenta antes de la adquisición real. Snapshot visual y contadores no certifican cadencia ni paridad integrada.

| Captura | Máximo desde preparación20 | Huecos >50ms en ventana | Máximo global | Huecos >50ms globales |
|---|---:|---:|---:|---:|
| REST timing |49,345ms|0|150,365ms|6|
| WATCH timing |50,240ms|1|219,805ms|8|
| REST visual |48,585ms|0|94,040ms|3|
| WATCH visual |141,020ms|4|141,020ms|6|
| Regresión seleccionada |50,150ms|1|212,910ms|8|

No se acepta cadencia ni se atribuye una causa a esos intervalos. Se conserva la ventana completa desde20 y el global, sin descartar picos.

[Evidencia, código investigado, hashes, pruebas, guards, trazas físicas, capturas y muestras](performance/native-initial-idle-outside-surface-validation-20261119.json).

## Siguiente punto

Corregir el cierre/retirada del Host tras rechazar una plantilla preparada, conservando el20 admitido y sus recursos. La recuperación incremental de 3.123, productor/cohort/paradas/relevos ordinarios y cadencia/plataforma siguen pendientes. A6/A/B/C abiertos; D no iniciado. El alcance de C integrado sigue requiriendo las partidas, campañas, biomas, plataformas y mecánicas del plan; estos dos actores de componente no lo sustituyen.
