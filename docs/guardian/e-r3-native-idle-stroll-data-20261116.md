# Paseo Idle: referencia tipada y adaptador de la fuente

Continuación de [la ejecución nativa 22](e-r3-native-idle-stroll-source-20261116.md), dentro de A6-04.f-R3. Se integran los datos de esa fuente en el bridge existente. No se habilitan todavía su transactor/puertos/control, presentación preparada ni tick de Game.

## Referencia consultada y decisión

Antes de diseñar el adaptador se leyó el código real de [Godot 4.3 `RID_Alloc`](https://github.com/godotengine/godot/blob/4.3-stable/core/templates/rid_owner.h): `_allocate_rid`, `get_or_null` y `free`. Contrasta índice y validador, y anula la identidad liberada. Se adapta esa comprobación mediante los handles existentes de Wild Guardians —epoch, sesión, slot y generación— y secuencias causales, conservando información de tamaño acotado. No se añade un asignador RID, otro registro de actores ni una dependencia. La consulta y ejecución del paseo siguen la decisión documentada de `NavigationAgent3D` del incremento anterior.

## Referencia y propuesta

`native-idle-stroll.js` define una referencia propia con identidad física, pose y acumuladores de origen, ancla, destino y RNG ya elegidos, calibración original y secuencias del ciclo y decisión. Contiene valores y handles; no incorpora `sourceBody`, `sourceCycle` ni una cadena de permisos. Copiar o validar su esquema no concede autoridad de ejecución. El proyector de la fuente reconstruye esa referencia desde los 72 doubles de la asociación nativa, sin depender de una copia histórica en JavaScript.

La captura de movimiento compartida admite la familia 22 con su ticket propio y reutiliza las muestras y curvas de puertas existentes. El esquema comprueba sus campos, origen, extremo y radio local, fases, ausencia de carrera/carga, duración y handles. La comparación con la petición 21 genuina comprueba además la identidad emitida, destino y estado privado. Una traslación temporal necesita un ticket sucesor; no puede alterar tiempos bajo el mismo ticket.

La preparación exige que Game siga reflejando la fase 21 ejecutada en el mismo watermark, con la pose, perfil, centro y contrato vigentes. No copia el WALK deseado sobre la vigilancia terminada. Revalidación y cancelación mantienen sus familias y epoch. La lectura de la asociación distingue el programa preparado del realmente adquirido, y la vista de ejecución devuelve la pose escrita por el ejecutor nativo, su WALK actual y el REST deseado por separado. No integra movimiento ni consume RNG en JavaScript.

No se proporciona aún una operación que adquiera 22 tras el recibo gráfico. Los fixtures usan la ABI de confianza para verificar esos adaptadores. Un consumidor que intenta adjuntarse con un paseo 22 activo se rechaza explícitamente hasta contar con la admisión gráfica preparada; no puede tomarlo como una ruta genérica de arranque. El estado nativo de Game sigue siendo no soportado para esa cohorte.

## Validación

Comandos, archivos y hashes en [la validación](performance/native-idle-stroll-data-validation-20261116.json).

- **7 casos nuevos del adaptador:** captura y cancelación de la decisión real; referencias acotadas y orden canónico; rechazos de campos/historias/roles/fases ajenos; revalidación y asociación actual, coincidencia con presentación existente y rechazo de arranque; Game con fase/pose/perfil/contrato ajenos; ejecución y llegada con REST separado en standalone/pthread; epoch y familia de ticket incorrectos.
- **74/74 pruebas dirigidas**, 37639.9572 ms, incluyendo fuente del paseo, Game21, Home, TaskStart y control de reanudación.
- **1150/1150 pruebas de regresión en 99 archivos**, 615321.0154 ms; **build de producto correcto en 45.09 s**. Las 21 entradas comprobadas conservan sus hashes durante los trabajos.

Las 17 entradas de fuentes y módulos nativos son idénticas al commit anterior: no se recompilan. Se preservan los 16 archivos locales ajenos protegidos y el helper pthread original. No hay prueba GPU22 ni evidencia nueva de recuperación de recursos gráficos en este componente.

## Siguiente punto del plan

Admitir 22 en el transactor, puertos y control directo existentes, con captura durante la preparación, recibo, revalidación y relevo exactos. Continuar con presentación sobre el mismo actor, Game, fuente estacionaria real tras la llegada y REST siguiente. Aproximación, anclas y cancelación ante bloqueo siguen pendientes, además de las demás clases/finales/puertas y el productor ordinario. Nacimiento y sustitución en vivo, recuperación incremental de 3123 recursos sanos y cierres A6/A/B/C continúan abiertos. No se inicia una campaña D.
