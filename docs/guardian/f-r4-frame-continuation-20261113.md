# f-R4: continuar un frame nativo rechazado conservando sus recursos

Continuación de 01f359aa2. **f-R4 sigue parcial**. La vía preparada ya continúa
en el mismo surface tras rechazar un frame nativo. La integración de la autoridad
normal, las otras familias y la aceptación con locomoción siguen pendientes.

## Referencias de código y decisión

Investigación incorporada a este mecanismo, conforme a la instrucción nueva del
usuario; queda también como flujo persistente en MIGRATION-OBJECTIVE.md.

- Babylon.js 8.0.0 estable:
  [WebGPUSnapshotRendering.enabled/reset](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Engines/WebGPU/webgpuSnapshotRendering.ts)
  reinicia las grabaciones sin recrear el motor;
  [WebGPUDrawContext.reset/dispose](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Engines/WebGPU/webgpuDrawContext.ts)
  distingue invalidez de caché y liberación. Es la base consolidada del patrón.
- Contrastado también con la revisión 4d6f60d93971a1de801cb6792186bfb5e7436301:
  [WebGPUSnapshotRendering](https://github.com/BabylonJS/Babylon.js/blob/4d6f60d93971a1de801cb6792186bfb5e7436301/packages/dev/core/src/Engines/WebGPU/webgpuSnapshotRendering.ts),
  handleRenderPassRestart/endFrame/reset. Separa la validez de la grabación y
  su transición a reproducción. Adoptamos descartar una grabación inválida y
  registrar otra sobre los recursos conservados. Su snapshot no aporta la
  frontera física de Wild; mantenemos la validación nativa existente.
- En esa misma revisión,
  [WebGPUDrawContext._invalidateVertexBuffers](https://github.com/BabylonJS/Babylon.js/blob/4d6f60d93971a1de801cb6792186bfb5e7436301/packages/dev/core/src/Engines/WebGPU/webgpuDrawContext.ts)
  invalida comandos enlazados conservando recursos de dibujo. Aprovechamos esa
  distinción; no llamamos a dispose ni reconstruimos el renderer.
- Three r180, contrastado con el código instalado:
  [Animation.start](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Animation.js)
  avanza NodeFrame y publica info.frame en su loop interno;
  [ShadowNode.updateBefore](https://github.com/mrdoob/three.js/blob/r180/src/nodes/lighting/ShadowNode.js)
  evita repetir una cámara en el mismo frame;
  [ViewportTextureNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/display/ViewportTextureNode.js)
  actualiza su copia una vez por frame. Por eso esperamos un info.frame real
  posterior al rechazo, en lugar de alterar contadores de Three o reintentar
  inmediatamente. Una prueba usa el ShadowNode real para reproducir la omisión
  dentro del mismo frame y la nueva ejecución con el mismo target en el siguiente.

La decisión usa el ciclo de render ya disponible en Three y la separación de
grabación/residencia de Babylon. No incorpora dependencias, otro render graph,
otra escena ni otra autoridad. Las referencias se consultan como implementación,
no como garantía de que esas bibliotecas resuelvan nuestros permisos causales.

## Aplicación en los propietarios existentes

El Worker solo conserva un rechazo tipado de mundo nativo si el host ha retenido
sus uploads y el surface acredita una propuesta preparada o un mundo nuevo ya
aplicado. Propuesta, recibo de terreno e identidad aplicada siguen perteneciendo
a sus propietarios actuales. Esperar una propuesta nunca concede tiempo o
autoriza dibujar sus recursos antes de terrain.confirm y del control directo.

La propuesta continúa identificada mientras el batch normal adopta su handle;
no hay un hueco que parezca ausencia de preparación entre transferencia y
confirmación. Se toleran ambos órdenes de llegada entre control y publicación.
Un evento del cliente remoto despierta al Worker después de instalar un requisito
nativo validado. Ninguna generación o época ajena se convierte en continuación.

El Worker avanza las publicaciones pendientes y espera fuera de beginFrame. Una
vez coinciden el mundo aplicado y el control, registra pases nuevos en el siguiente
frame interno de Three. Invalida la necesidad de dibujar sombras, conservando sus
targets; las capturas por frame vuelven a producir sus pases mediante sus dueños.
El host incorpora los uploads retenidos que usan esos comandos nuevos. No se
retaggea el paquete antiguo ni se borra la caché de geometrías, texturas o pipelines.
Las notificaciones de frame/preview se actualizan tras presentación válida.

La espera tiene un watchdog de diez segundos visibles. Ocultar la presentación
suspende su cómputo; volver a mostrarla conserva el tiempo restante. Cancelación,
disposición o éxito anulan el callback por generación. Timeout/fallo vuelve al
handoff de recuperación existente; no equivale a un recibo de presentación o
drenaje. El picker y el dibujo no usan un mundo gráfico pendiente.

## Evidencia y validación

[Recibo NVIDIA/Turing](performance/native-frame-continuation-20261113.json) y
[captura](performance/native-frame-continuation-20261113.png). Se amplía el harness
existente con los Workers **reales** de presentación y dibujo de producto y la
fixture autoritativa nativa. Un relay conserva el orden de mensajes y retrasa un
frame en tránsito después de prepararse el delta, sin bloquear el canal de control.
El commit físico real hace obsoleta esa grabación. Se repite para retirada y
readmisión del chunk (-1,-1).

| Observación | Resultado |
| --- | --- |
| Frames rechazados y continuados | 2 |
| Pases de cada grabación antigua y de su sustituta | 2 y 2 |
| Buffers de vértices compartidos entre ambas grabaciones | 93 en cada caso |
| Buffers leídos por el sustituto cuyo upload anterior no se reenvía | 39 y 21 |
| Identidad del Worker de presentación | La misma, fase running |
| Dispositivos/surfaces sustituidos | 0 en este ensayo |
| Factories acumuladas del proxy | 2128 → 2503 |
| Errores GPU capturados y errores de la fixture | 0 |

El contador incluye las asignaciones normales de actualización/preparación y
posibles cargas iniciales que terminan durante el ensayo. No es un presupuesto
de memoria ni acredita que cada asignación sea mínima; la conservación se prueba
con las identidades y referencias reales. Se verifican también el cierre del
Worker y el recibo de drenaje del consumidor antes de terminar el harness.

914 pruebas de 79 archivos, cero fallos/skips con --test-concurrency=4:
.cache/native-frame-continuation-selection.json y
.cache/native-frame-continuation-regression.tap. La selección incluye once casos
nuevos de continuación/Worker, el comportamiento real de ShadowNode y una prueba
del despertar de control tras validar la nueva frontera. Las 123 pruebas dirigidas
constan en .cache/native-frame-continuation-directed-final.tap. Build WebGPU y
comprobaciones de sintaxis del harness aprobados (build en 41,74 s); registro en
.cache/native-frame-continuation-build.log.

Reproducción: tools/experiments/audit_webgpu_temporal_ground.mjs con
QA_NATIVE_DELTA=true, QA_NATIVE_OBSOLETE=true, QA_BASE_URL y PLAYWRIGHT_MODULE
configurados, usando .cache/tooling/node20.exe. No se añade un comando QA a la
autoridad o al Worker de producto.

## Alcance pendiente

Es una partida de fixture a tiempo nativo 10 s, con un trabajador estacionario
real y una mutación fuera de su encuadre. El relay provoca un rechazo en tránsito;
la cancelación de paquetes esperando recursos ya tiene cobertura en el host.
No es aceptación de autonomía, continuidad de locomoción ni ausencia global de
tirones, y no se ha activado la vía nativa en el gameplay normal.

La regresión sin propuesta gráfica conserva su handoff anterior, seis dibujos
recuperados y cero errores GPU, pero crea 3123 factories en un surface nuevo
(.cache/native-frame-continuation-fallback-regression.json). Esa rama sigue
siendo una brecha pendiente; el resultado positivo de arriba exige el delta
preparado y no convierte toda recuperación con dispositivo sano en resuelta.

Los intervalos históricos no sellados, una preparación ausente y operaciones
que el host no puede retener con su contrato actual conservan la recuperación
anterior. Falta resolver los casos ordinarios restantes mediante sus propietarios
y completar el reemplazo de la protección histórica por planes nativos; no
optimizar el playback histórico como sustituto. También quedan preparación y
commit de otras familias/metadatos, integración de autoridad y aceptación A–F.
e-R3/e-R4/f-R4 y los once padres A6 permanecen abiertos.
