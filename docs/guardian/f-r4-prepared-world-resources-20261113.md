# f-R4: recursos canónicos antes del efecto físico

Continuación de eec8e251c, 13 de noviembre de 2026. **f-R4 parcial.**
No cambia el recuento de A6 y no se activa otro ejecutor de juego.

## Corrección de alcance: conservar los recursos gráficos

La observación del usuario sobre los 3123 recursos es correcta. El
[ensayo de recuperación anterior](performance/native-world-obsolete-20261113.json)
reemplaza el Worker de dibujo y crea otro GPUDevice. Los recursos del dispositivo
anterior no pueden usarse en el nuevo. Su recibo demuestra seguridad del rechazo
y recuperación, **no** ausencia de tirones ni una mutación incremental aceptable.
Recrear todo el dispositivo ante un frame obsoleto con dispositivo sano es un
fallback temporal demasiado amplio, pendiente de sustituir. No se renombra ese
comportamiento como cumplimiento de A4/f-R4 o como una optimización opcional D.

El camino normal debe conservar dispositivo, renderer y recursos sin cambios;
preparar exclusivamente el cambio mientras la generación vigente puede seguir
dibujándose; pedir la quiescencia solo cuando sus dependencias estén preparadas;
y coordinar efecto físico, activación y frame sin retagging. Un rechazo aislado
debe conservar/versionar los uploads pendientes para recuperar en el dispositivo
sano. La pérdida real de dispositivo mantiene su recuperación completa.

Se apartó el incremento local que esperaba la admisión de escena después del
commit físico: habría añadido otra espera con el dibujo detenido. No se ha
incorporado a la rama.
## Implementación de la vista nativa previa

Wild Engine puede producir ahora recursos canónicos de una propuesta todavía
sin efecto. El modo es explícito: las llamadas existentes no generan estos
buffers adicionales. Las mismas operaciones/recetas nativas producen únicamente
los chunks afectados o las identidades de retirada. No se genera mundo en JS,
no se publica scratch como residencia y no se copian todos los recursos gráficos.

La vista cubre adición/retiro de residencia, supresión/restauración de props,
asentamientos de terreno dentro del dominio nativo actual y publicación pthread.
Las familias overlay sin propietario gráfico rechazan esta modalidad.

Los nuevos exports spatial_world_proposal_stage_resources y
spatial_world_proposal_resource_* entregan un header de nueve doubles y el
journal de tres enteros por chunk. Los campos son versión, sesión, ticket,
instante, familia, número de cambios y revisiones de terreno/overlay/residencia.
Cada fila contiene operación 1/2 y cx/cz. Los buffers por fila reutilizan el
formato canónico de alturas, colores, máscara, agua y props. Una retirada no
construye geometría. El lector existente spatialChunkPayload compone las copias
propiedad de JS; nunca selecciona el chunk propuesto como chunk vivo.

captureNativeWorldProposalResources valida identidad y límites y marca
phase:proposal. La vista es transitoria, no un checkpoint durable, permiso de
reloj ni constancia de que la GPU aplicó el mundo. Mantiene selección, mundo,
IDs, residencia y rutas intactos. Una dependencia cambiada invalida la propuesta.
El release o una generación nueva liberan sus buffers; una lectura ajena no
puede confundir otro ticket con el suyo.

mutateNativeWorldAfterGpuQuiescence admite ahora un prepareResources opcional.
Su secuencia es propuesta nativa → preparación asíncrona → revalidación nativa →
quiescencia/drenaje → commit físico → commit síncrono del handle preparado →
release del hold. El handle aporta valid/commit/abort; un resultado ambiguo no
es disponibilidad GPU. Cancelación y preparación fallida salen antes del hold.
Se aborta también un propietario que llegue después de cancelar una espera.
Si falla la adopción después del efecto físico, se cierra el canal retenido;
no se libera falsamente como mutación abortada.

Se corrige además la restauración de selección tras un cambio de props: usa el
snapshot residente ya instalado, sin regenerar/republicar el chunk seleccionado
que no cambió. Así el journal físico no exige reconstruir esa geometría ajena.

## Validación y límites pendientes

Continuación: [retención en transporte y evidencia en el mismo dispositivo](f-r4-retained-preparations-20261113.md).
La conexión del preparador de producto sigue pendiente; su fallback todavía recrea
3123 recursos. Este enlace no cierra la aceptación de fluidez ni de personajes.

- Siete pruebas nuevas de Wild Engine real verifican espera antes del hold,
  identidad, igualdad exacta con los payloads del commit, mundo/selección sin
  efecto, cancelación con preparación no resuelta y llegada tardía, dependencias
  cambiadas, fallo posterior al commit y el resultado pthread real.
- La selección ampliada pasa **859 pruebas de 73 archivos**, cero fallos/skips:
  .cache/native-resource-preview-selection.json y
  .cache/native-resource-preview-regression.tap.
- Standalone y pthread reconstruidos con los flags del build oficial:
  .cache/native-world-resource-preview-build.log. Se conserva el aviso existente
  de pthread con crecimiento de memoria.
- Build de producto WebGPU aprobado en **1 min 2 s**:
  .cache/native-resource-preview-product-build.log.
- El control real de autoridad/Shield conserva 15 dibujos durante un bloqueo de
  500 ms y cero errores capturados (.cache/native-resource-preview-product-control.log).
  Sigue siendo su fixture sin mallas de personajes ni locomoción GPU nativa.

El handle gráfico de las nuevas pruebas es un doble de contrato. Todavía falta
conectar la propuesta al preparador de producto por los canales existentes,
conservar las generaciones de recursos/los uploads al rechazar un frame sano,
y comprobar en GPU real que las identidades sin cambios se reutilizan y que el
dibujo anterior continúa durante la preparación del cambio. No se afirma que
esta entrega ya haya eliminado los 3123 recursos del fallback, la pausa durante
el commit o los costes de recalcular recetas nativas al confirmar.

Después siguen la autoridad/interfaz normales y la aceptación integrada de
personajes con planes nativos completos, bloqueo del preparador, pausa/velocidad
y revocación. Permanecen e-R3/e-R4/f-R4 y los once padres de A6 abiertos.
