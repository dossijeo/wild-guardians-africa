# Relevo de llegada de Carry y liquidación nativa

Continuación de los [datos de entrega](e-r3-native-delivery-consequence-data-20261115.md) y del [consumidor Harvest → Carry](e-r3-native-consequence-presentation-20261115.md), bajo el [plan principal](integrated-gpu-migration-plan-20261104.md). El alcance es el propietario autoritativo y la proyección de fuente. La preparación gráfica de la presentación posterior sigue pendiente; no se activa la entrega en producto ni cambia ningún cierre A6.

## Observación coherente de una liquidación

Se leyó [Flecs v4.0.4, `flecs_stage_merge`](https://github.com/SanderMertens/flecs/blob/v4.0.4/src/stage.c#L69): aplica las operaciones diferidas y después evalúa monitores. Se adapta la distinción entre modificar el estado y notificar sobre el resultado. No se incorpora Flecs ni otra cola de eventos.

`transact` mantiene el cálculo racional, redondeo a monedas enteras, identidad idempotente y notificación ordinaria inmediata. El propietario de una consecuencia puede proporcionar un callback para capturar esa única notificación y usar `notifySettlement` cuando su resultado completo sea observable. Es un dato local de la llamada síncrona, no una cola o transacción económica alternativa. La configuración se comprueba antes de escribir; sin fondos no se confirma ni se notifica.

Las tres pruebas de `settlement-notification.test.js` comprueban el comportamiento ordinario, la captura del valor ya redondeado y su observación posterior, la idempotencia y el rechazo sin escrituras. La proyección nativa de entrega usa este callback para que los observadores vean conjuntamente ledger, potencia, caja, trabajador y tutorial.

## El cuerpo conserva su propietario al entregar

Antes del diseño se leyó [DetourCrowd v1.6.0, `resetMoveTarget`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L609): retira el destino y la velocidad deseada sin retirar el agente activo. Se adapta esa separación al final real de Carry, sobre `ActiveIntent`, el registro de cuerpos y el ejecutor comunes. No se usa una ruta Home/Resume ficticia, una tarea artificial o una ruta de longitud cero.

La familia 17 solo se prepara sobre una asociación Carry nativa exacta, llegada ejecutada y cuerpo actual. La candidata no libera el cuerpo, entrega la caja ni cambia la elegibilidad. El commit condicionado retira la reserva de la ruta completada y conserva el mismo cuerpo mediante una asociación estacionaria en ese mismo `ActiveIntent`, con posición, orientación y fases reales. El estado nativo `IdleActive` carece de tarea. La asociación conserva únicamente metadatos inmutables de procedencia; no copia otro mundo, registro físico o trayectoria.

Se conservan la propuesta pendiente, frontera causal y transactor de recursos existentes. Una revalidación puede trasladar el comienzo al instante real posterior, pero debe conservar exactamente el cuerpo preparado. Si retirar la ruta afectase a otro actor sin su parada preparada, la propuesta no se admite. Las modificaciones físicas y la reasignación del enlace a otro cuerpo siguen protegidas. Una prueba negativa con el binario anterior al nuevo guard reproduce la reasignación indebida; con el guard la rechaza y mantiene la asociación.

El perfil común exige `nativeTaskSettlementVersion:1` y `preparedTaskSettlementTemplate` exacto en el recibo del consumidor. Solo después del commit nativo `projectNativeCrateDeliveryConsequence` liquida potencia, registra el ingreso, entrega la caja, retira el transporte y actualiza trabajador/tutorial. Antes de las notificaciones todos esos campos son coherentes. Un preview o JSON de asociación no concede el efecto. Los observadores nuevos de la fuente reciben las asociaciones estacionarias actuales desde C++; no se reconstruyen permisos a partir del estado de Game.

## Reclamación de la siguiente tarea sin un hueco físico

El planificador global puede reclamar una tarea real para el trabajador disponible. Esa reclamación conserva la asociación estacionaria mientras la tarea espera recursos. La ruta siguiente se prepara por la familia 14 existente, con transferencia tipada desde esa asociación y fases conservadas. El cuerpo cambia al propietario de la ruta únicamente durante su commit condicionado. El modo de asignación sin recursos no puede descartar el propietario estacionario.

La revisión encontró además que el rechazo de un lote obsoleto podía llamar a `resetFromState`, cambiando la sesión de todo el grupo nativo. Se consultó [`dtCrowd::updateMoveRequest`](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L749): comprueba el resultado diferido respecto al corredor vigente y rechaza el resultado incompatible sin reiniciar todo el crowd. Nuestro rechazo descarta el lote y vuelve a habilitar la planificación; si existe reloj nativo, conserva mundo, cuerpos y asociaciones. El reinicio anterior permanece exclusivamente en el backend sin reloj nativo. Una prueba negativa con el módulo previo a esta corrección reproduce el cambio de sesión; la prueba corregida conserva sesión, ambas poses y la asociación, y admite un nuevo lote válido.

## Límite de entrega

La asociación y los efectos están implementados en la fuente y en Game, también en pthread. El consumidor gráfico de Idle y su relevo visual a la nueva tarea **siguen pendientes**. La versión y plantilla obligatorias impiden que el consumidor actual autorice esa mutación; además rechaza un baseline con cuerpos estacionarios cuyo sucesor gráfico no ha admitido. Las pruebas de fuente usan dobles explícitos de paquete retenido y drenaje, no una GPU para esta familia.

Se mantiene el límite de regreso por contrato de Game. Una entrega que deba ir directamente a Home no se transforma en Idle: requiere el próximo recurso y plan Home genuinos. La presentación y restauración de todas las clases, el Idle inicial sin tarea, el productor ordinario, la recuperación integral y la aceptación A/B/C siguen abiertos. Este incremento no cierra la reutilización de los 3123 recursos ni demuestra ausencia de tirones gráficos.

## Validación

La [evidencia de fuente](performance/native-delivery-settlement-source-validation-20261115.json) registra **20/20 pruebas dirigidas** y **502/502 en 41 archivos de regresión**, sin omisiones. Comprueba preparación/cancelación sin efectos, revalidación tardía, procedencia exacta, rechazo de recibos incompletos, coherencia ante observadores, propiedad física, nueva tarea real, lote obsoleto sin reinicio y bloqueo del consumidor aún incompleto. Los dos controles negativos anteriores reproducen los fallos que corrigen sus guards. Los 14 exports canónicos están presentes en standalone y en la interfaz pública pthread; el mismo flujo de liquidación/proyección se ejecuta también en pthread. Compilación de producto aprobada en 47,91 s con los avisos existentes.

La regresión gráfica del **Harvest → Carry ya implementado** vuelve a pasar en Edge/NVIDIA Turing: 53 fotogramas de Carry durante el bloqueo deliberado de 1,8 s, 536 recursos durante preparación y cero creaciones/forks después de READY. Conserva las identidades comprobadas, la selección devuelve el trabajador portando la caja y no registra errores GPU, de página o de red; termina drenado. Este ensayo no ejecuta el nuevo sucesor gráfico de entrega y no lo valida indirectamente.
