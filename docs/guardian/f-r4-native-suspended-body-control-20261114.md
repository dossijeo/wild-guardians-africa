# f-R4 parcial: autoridad del cuerpo suspendido preparado

Fecha: 2026-11-14. Base: `7ce3ab327`. Rama: `codex/guardian-3d-animation`.
Continúa las [consecuencias nativas de parada](f-r4-native-stop-projection-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Los once padres A6 y e-R3/e-R4/f-R4 siguen abiertos.

## Cambio efectivo

Una referencia de cuerpo suspendido puede prepararse para el ticket de mundo
existente sin convertir una asignación revocada en una ruta ejecutable. El bridge
copia sus identidades antes de entregar arrays al preparador. Tras el commit
comprueba en C++ el cuerpo retenido, actor, sesión, slot, generación de reanudación
e instante de suspensión. La confirmación viaja en la liberación de quiescencia
del canal directo existente, después de publicar eventos y reloj del mismo tiempo.
Los arrays de recursos gráficos no pueden instalar esa confirmación.

El consumidor admite la referencia preparada sin dibujarla, comprueba toda la
lista confirmada antes de instalarla y vuelve a admitir el paquete en la frontera
física. La comprobación de vigencia se conserva en cada envío posterior. Un
cambio posterior del actor, cancelación, nueva asignación o cierre invalida la
referencia aunque se reutilicen IDs o el estado numérico siga siendo cuatro.
La referencia original de ruta continúa revocada.

Solo se aceptan suspensiones con cuerpo fijado por C++; el estado NeedsPlan no
acredita esa propiedad. No se deduce una suspensión del estado cuatro aislado.
La prueba directa del cuerpo retenido es obligatoria. Tampoco se añade otro
temporizador ni permiso de futuro: un límite amplio de residencia del recurso
queda acotado por el tiempo finito ya ejecutado y publicado desde C++.

El binding tiene etiqueta exclusiva `nativeSuspended`. El cliente exige que el
dibujante anuncie `nativeSuspendedVersion: 1`, evitando que un dibujante anterior
interprete la etiqueta nueva como un reloj ordinario. La selección utiliza el
Float32 realmente enviado para esa identidad y no toma prestado el tiempo de
la asignación revocada.

## Referencia de implementación

Se consulta código real de [Godot 4.5.1, rid_owner.h](https://github.com/godotengine/godot/blob/4.5.1-stable/core/templates/rid_owner.h):
`_allocate_rid`, `get_or_null`, `initialize_rid` y `free` separan reserva,
disponibilidad y uso, y contrastan el validador antes de resolver un slot.
Se adapta ese patrón al permiso existente: la reserva gráfica no equivale a
disponibilidad confirmada y una generación vieja no vuelve a ser válida al
reutilizar el slot. Se conserva la tupla y el log nativos del repositorio, sin
añadir un pool ni una dependencia de Godot. La confirmación de cuerpo y la
frontera causal son requisitos propios del protocolo de Wild Guardians.

También se revisa [Babylon 8.0.0, InternalTexture](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/core/src/Materials/Textures/internalTexture.ts):
`incrementReferences` y `dispose` conservan una textura compartida hasta que
desaparece su última referencia. Es la referencia para el siguiente paso de
retener los datos GPU durante movimiento → espera; todavía no se implementa aquí.

## Validación y límite de entrega

Pasan 149 pruebas dirigidas. La regresión amplia de 147 archivos registra
1.650 casos: 1.648 aprobados y los dos fallos heredados Carry/Harvest, sin
omisiones ni cancelaciones. Build aprobado en 42.37s; 308
scripts inline de 366 HTML y los doce módulos propios pasan sintaxis.
El [recibo](performance/native-suspended-body-control-validation-20261114.json)
registra selección, comandos, ámbito y hashes. No cambian los binarios WASM.

La prueba conectada usa WASM real, los puertos existentes y dispositivo GPU
simulado: prepara una retirada de residencia futura sobre una ruta admitida con
puerta, confirma su suspensión en C++, adopta el paquete y cancela después el actor.
El paquete anterior sigue intacto durante preparación. Cambiar los arrays del
preparador no altera la identidad que confirma la autoridad. Si se suprime la
confirmación directa, el consumidor rechaza el paquete y permanece sin enviar
dibujos. Los casos de referencia comprueban expiración, generaciones, cambios
posteriores, cancelación, conjuntos atómicos y selección del tiempo enviado.

Este incremento valida control y transporte. No acredita una pose Idle del
trabajador original en hardware: la sustitución gráfica de una ruta afectada
sigue protegida en el surface. Siguiente punto: preparar esa pose y el motor
de puerta fijo en la misma transacción, conservando textura, rig, geometrías y
recursos no modificados. Alimentación ordinaria, todas las intenciones,
consecuencias de gameplay, persistencia y aceptación integrada siguen pendientes.
