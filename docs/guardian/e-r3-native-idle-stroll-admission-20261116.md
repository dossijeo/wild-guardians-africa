# Paseo Idle: transactor y transporte preparado existentes

Continuación del [control directo 22](e-r3-native-idle-stroll-control-20261116.md), dentro de A6-04.f-R3. Se integra la familia del paseo en el transactor y los dos canales existentes. Su consumidor GPU y proyección de Game siguen pendientes.

## Referencia y adaptación

Se aplica la revisión previa de código real de [Godot 4.3 `RenderingDevice`](https://github.com/godotengine/godot/blob/4.3-stable/servers/rendering/rendering_device.cpp), documentada en el incremento de control. La adquisición conserva el orden existente de finalización de cola y retirada diferida. No se añade una cola, planificador o dependencia.

## Recorrido preparado

El perfil `idle-stroll` utiliza `preparedIdleStrollTemplate`, `nativeIdleStrollBinding`, `nativeStrolls` y versión de recibo propia. El wrapper conserva la validación de Game21 ejecutado durante la espera; no instala WALK anticipadamente. Prepara una vez, obtiene el recibo, consulta de nuevo la autoridad nativa y admite el ticket preparado sólo cuando siguen siendo compatibles los programas relativos de movimiento y puertas. El primer paseo inicia el ejecutor antes de publicar su asociación.

La publicación contrasta template y versión del ACK, retiene la frontera del paquete y excluye 22 de las otras nueve familias. Al liberar exige la asociación de la adquisición nativa, la frontera y las secuencias efectivas. Publica evento y watermark antes de liberar el hold. Los cambios de pose, rol, contrato o RNG de Game invalidan el contexto; cancelación o recibo ajeno retienen la fase previa y el cuerpo. El destino y RNG elegidos se reutilizan al reintentar.

Cliente, conexión y receptor transportan preparación, invalidación, renovación y commit dentro de sus propietarios actuales. La renovación mantiene el template 22; una clase Home sobre ese recurso se rechaza y cancela la retención. No se entra en el FIFO de comandos de la autoridad durante la preparación.

## Validación

Comandos, archivos y hashes en [la validación](performance/native-idle-stroll-admission-validation-20261116.json).

- **17 casos nuevos:** primer movimiento y compañero en marcha durante preparación/drenaje; ticket revalidado y asociación original/actual; cuatro contextos inválidos antes de preparar; cambios durante preparación/drenaje; cancelación y reintento con mismo destino/RNG; versión/template/familia falsificados; renovación a través de ambos puertos; template ausente; renovación con clase ajena; pthread; exclusiones del perfil.
- **54/54 pruebas dirigidas**, 20672.9443 ms, incluyendo los canales y admisión 21 anteriores.
- **1177/1177 pruebas de regresión en 101 archivos**, 635459.2802 ms, incluyendo el control 22 del commit anterior. **Build de producto correcto en 49.58 s.** Las 30 entradas comprobadas conservan sus hashes durante ambos trabajos.

Las fuentes WASM, el control directo, la publicación y los dos MessageChannels son reales. Recursos retenidos y recibo de drenaje son dobles deterministas: estas pruebas no verifican dibujo GPU22, cola hardware ni costes gráficos. El fixture inicial de reintento cerraba un consumidor sin drenarlo y esperaba sustituirlo; se corrigió para reutilizar la conexión, preservando la protección de autoridad.

Las 17 entradas nativas son idénticas al incremento anterior, sin recompilar. Se conservan los 16 archivos locales ajenos protegidos y el helper pthread original. El draw worker/Host todavía no anuncia capacidad gráfica 22 y su arranque histórico sigue rechazado.

## Siguiente punto del plan

Implementar el consumidor preparado 22 sobre actor, Surface y bancos residentes, con reloj/picking y relevo exactos; obtener evidencia GPU de recursos conservados y ausencia de asignaciones tras READY. Completar Game22, fuente estacionaria real y REST tras el paseo, aproximación/anclas/cancelación ante bloqueo. Productor ordinario, otras clases/finales/puertas, nacimiento/sustitución en vivo, recuperación incremental integral de 3123 recursos sanos y cierres A6/A/B/C siguen abiertos. No se inicia D.
