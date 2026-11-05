# Efectos de trabajo en el Worker WebGPU: estado QA

La escena WebGPU experimental reproduce efectos visuales de trabajo a partir de
`workVfxPlans` y del estado y eventos confirmados. Reutiliza el atlas y la
simulación visual existentes; tierra, agua, maíz y hojas utilizan geometrías y
materiales compartidos entre efectos. El riego interpola los recorridos de
boquilla precalculados y verifica su correspondencia con los modelos mediante
su hash. La posición procede del trabajador confirmado y la altura, del suelo
residente. No se modifican tareas ni resultados de simulación.

Los recursos se cargan cuando son necesarios. Si fallan los datos de riego,
se registra `workFailure` y continúan los demás efectos. La vía de `WorkVfx`
heredada sigue ejecutándose: todavía no existe una confirmación de preparación
de recursos y cobertura suficiente para retirarla con fallback seguro.

Las pruebas dirigidas comparan matemáticamente el emisor WebGPU con el método
real `WorldScene.wateringSource`, con suelo simulado; comprueban planes de
trabajo, partículas rígidas, tiempo confirmado sin avance y fallo de carga.
No son una prueba de juego real ni de GPU. Faltan capturas comparativas en
WebGPU, validar herramientas, materiales e iluminación, cobertura de tipos de
trabajo, pausas y recuperación gráfica. No se ha medido ahorro ni se ha
demostrado paridad visual; la integración sigue siendo experimental.

## Transición y fallback

Una prueba con dos instancias reales de `WorkVfx` muestra que no basta con
reanudar el efecto heredado en el tiempo actual: si la boquilla cambia de
posición mientras la actualización está suspendida, los nacimientos omitidos
se reconstruyen con la posición final y las partículas difieren. Por ello no se
omite la actualización heredada ni se usa una señal de disponibilidad como
permiso para hacerlo. Para eliminarla haría falta conservar el historial
temporal del emisor y de la superficie, o transferir un checkpoint completo de
la simulación visual, incluido el estado aleatorio y de eventos. El fallback
tendría que recibir una versión coherente y seguir funcionando también cuando
el Worker gráfico falle antes de publicar un checkpoint actualizado.

El simulador nativo ofrece ahora exportación e importación bajo demanda de un
checkpoint v1 para `dig`, `water`, `harvest` y `dust`. Incluye reloj, RNG,
cursor de eventos, partículas, sólidos y configuración; recrea localmente los
callbacks y rechaza datos incompatibles antes de modificar el efecto. Las
pruebas verifican una continuación determinista con el mismo emisor y suelo.
El checkpoint no contiene esos callbacks ni el historial de las entradas: el
receptor debe proporcionar superficies y emisores equivalentes. Tampoco se ha
conectado al transporte o a la recuperación del gestor, ni garantiza todavía
la continuidad ante una caída del Worker gráfico. Legacy sigue activo.

Existe una transferencia QA explícita desde el Worker gráfico al gestor
heredado real: con `qa-webgpu-work-checkpoint`,
`wildGuardiansRecoverWorkVfxQa()` solicita un checkpoint de la secuencia
confirmada. El receptor comprueba que la secuencia y el tiempo no hayan
cambiado, valida planes y altura, prepara todos los efectos y solo después
sustituye la colección anterior. Rechaza recursos, planes o datos
incompatibles sin reemplazar los efectos activos. No es recuperación automática
ni conserva los cambios posteriores al checkpoint; no debe usarse como
fallback de una caída. El consumidor y transporte siguen pendientes de prueba
integrada con un Worker gráfico WebGPU real.

Con `qa-webgpu-recovery` y `qa-webgpu-work-recovery` se ensaya además un
checkpoint de efectos asociado al ACK exacto del checkpoint de terreno. El host
conserva ambos y el Worker gráfico de reemplazo carga los recursos y restaura
los efectos antes de aceptar el replay de publicaciones. Para preservar el
historial de entradas, esta opción desactiva la coalescencia de la cola visual
y la compactación del journal. Sus límites y backpressure siguen activos, por
lo que puede saturarse; no es una optimización de producción. Se mantiene la
ruta heredada, y aún falta comprobar una caída real del dispositivo y la
reconexión automática; no se considera resuelta la recuperación arbitraria.

El host dispone de una operación QA explícita `markVisualLostForQa()`: tras
comprobar que existe una base reconocida y que el journal es íntegro, separa
el canal gráfico perdido, abandona solo un candidato aún sin ACK y conserva
sus publicaciones y eventos. Las publicaciones posteriores siguen entrando
en el journal acotado; al saturarse se aplica backpressure. La operación no se
invoca automáticamente y aún necesita una prueba de extremo a extremo con
pérdida real de dispositivo antes de conectar esa activación.

La fixture `tests/browser/worker-visual-loss-recovery.html` prueba el host y la
autoridad reales con consumidores gráficos y de terreno simulados. En una
ejecución, partió del checkpoint confirmado 14, retuvo el candidato 20,
registró la pérdida en la secuencia 32 y reprodujo 18 publicaciones hasta la
32, con el evento confirmado una sola vez. La autoridad aceptó otra consulta
tras el reenganche. No ejecuta WebGPU ni reconstruye partículas reales. Con
Vite en `http://127.0.0.1:5187` y Playwright accesible mediante `NODE_PATH`, se
reproduce con `node tools/experiments/audit_worker_visual_loss_recovery.mjs`.

Si se pierde el canal de terreno con un ACK pendiente, la autoridad
puede seguir ocupada; `markVisualLostForQa()` espera un límite y rechaza la
operación si este no se alcanza. Ese caso no dispone todavía de recuperación
demostrada y no debe activar el protocolo automáticamente.
