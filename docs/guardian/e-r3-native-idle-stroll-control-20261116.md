# Paseo Idle: asociación en el control directo existente

Continuación del [adaptador de fuente 22](e-r3-native-idle-stroll-data-20261116.md), dentro de A6-04.f-R3. Se completa el control directo del permiso preparado y su asociación a la adquisición nativa. Transactor, puertos y consumidor GPU22 siguen pendientes.

## Referencia y decisión

Antes de implementar se leyó el código real de [Godot 4.3 `RenderingDevice`](https://github.com/godotengine/godot/blob/4.3-stable/servers/rendering/rendering_device.cpp): `_begin_frame`, `_free_pending_resources` y `_stall_for_previous_frames`. Espera la fence antes de retirar recursos pendientes, en orden de dependencias. Se conserva ese orden dentro de nuestros propietarios y protocolo existentes; no se crea otra cola, renderer o dependencia. La fence/recibo de Wild Guardians se conectará a 22 en el siguiente incremento.

## Adquisición y permiso

La fuente incorpora `nativeIdleStroll` al evento `RouteAssigned` exacto, leyendo la asociación nativa completa después del commit y establecimiento de la ejecución. Se utiliza el flush existente antes de otro relevo: no se añade un historial nativo ni un log de intenciones JavaScript.

El control contrasta tipo, actor, secuencia, handle, origen temporal y petición WALK realmente emitida por el ciclo 21. Rechaza el evento sin esa asociación y las mezclas con Task/Home/Idle. Antes de borrar la fase anterior, conserva su petición elegida y si la presentación de ese ciclo estaba admitida dentro del mismo registro de actor. Así, los metadatos nativos por sí solos no conceden preparación ni instalación de 22.

`admitStroll` distingue preparado de actual. La adquisición observada conserva el permiso preparado mientras llega su watermark; no entrega un registro dibujable. `installStrolls` exige la asociación exacta publicada, frontera actual, presentación de origen admitida y ausencia de otros propietarios. Comprueba todo el lote antes de modificarlo. Rechaza bootstrap histórico, duplicados y programas alterados. Tras instalar, el lease obtiene el mismo registro de ruta; el retiro invalida esa generación y acota su `safeUntil`.

## Validación

Resultados y hashes en [la validación](performance/native-idle-stroll-control-validation-20261116.json).

- **11 pruebas nuevas:** cuatro perfiles; cuerpo retenido y compañero en marcha; adquisición/revalidación frente a instalación; rechazo sin ciclo presentado; primer movimiento sin compañero; lotes atómicos y programas falsificados; evento omitido o ajeno sin avanzar cursor; watermark retrasado; retiro y generación no resucitable.
- **188/188 pruebas dirigidas en 18 archivos**, 99924.4122 ms: fuentes 20/21/22, controles Idle/Home/reanudación/acciones/entrega y preparación/puertos anteriores, selección y reloj causal.
- **Build de producto correcto en 46.15 s.** Las cinco entradas de código conservan sus hashes durante ambos trabajos. Las 17 entradas nativas siguen idénticas, sin recompilar. Se preservan los 16 archivos locales ajenos protegidos y el helper pthread original.

La validación de este incremento es dirigida; no se atribuye al código nuevo la regresión completa anterior. Los tests conectan fuente WASM y control reales, con instalación de metadatos preparada por el fixture. No ejercitan aún el recibo GPU22 ni su dibujo hardware. El arranque gráfico de un 22 ya activo continúa rechazado.

## Siguiente punto del plan

Integrar 22 en el transactor y puertos existentes, con preparación, drenaje, revalidación, recibo y publicación del relevo exactos. Después completar presentación sobre el mismo actor, Game22 y fuente estacionaria real tras llegar para el REST siguiente. Aproximación/anclas/cancelación ante bloqueo, otras clases/finales/puertas y productor ordinario siguen abiertos. También nacimiento/sustitución en vivo, recuperación incremental integral de 3123 recursos sanos y cierres A6/A/B/C. No se inicia D.
