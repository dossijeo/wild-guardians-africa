# f-R4 parcial: permiso de reanudación ligado a la asignación real

Fecha: 2026-11-14. Base: `272cfd73b`. Rama: `codex/guardian-3d-animation`.
Continúa la [propuesta nativa de reanudación](f-r4-native-resume-proposal-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Implementado

La nueva referencia `native-route-resume-reference` identifica el ticket exacto,
el cuerpo suspendido, su asignación y generación de origen, la generación
candidata y el intervalo preparado. No contiene una secuencia de asignación
futura. La admisión ordinaria de rutas conserva sus requisitos anteriores.

El consumidor puede preparar esa referencia únicamente desde un cuerpo cuya
suspensión ya confirmó la autoridad directa. Preparación no concede permiso de
dibujo. Cuando C++ confirma el candidato, el bridge obtiene la secuencia real
emitida y verifica identidad, inicio y final contra una copia privada anterior
al callback de preparación. Restablece el cohort de ejecución en la misma
frontera y publica el control/reloj antes de liberar la retención GPU existente.
No avanza el cuerpo mediante un reloj gráfico.

La liberación directa incorpora esa relación entre propuesta y asignación.
El propietario del dibujo comprueba primero el conjunto completo y solo después
instala los permisos de reanudación. Sin esa relación, una generación candidata
reutilizada no autoriza un paquete antiguo. Un evento posterior del actor,
cancelación o cierre invalida el permiso. El recurso preparado conserva su techo
temporal y recibe el mismo límite de revocación de la asignación real.

Se conectan la negociación explícita `nativeResumeVersion:1`, el registro del
uniforme sin cambiar la clave estructural Three, la adopción del paquete retenido
y la lectura de selección desde el tiempo Float32 efectivamente enviado al
consumidor. La selección de reanudación tiene su identidad propia: no toma el
reloj de la ruta revocada ni el del cuerpo suspendido.

## Referencia de código y decisión

Se consultó el código de [Godot 4.5.1, RID_Alloc](https://github.com/godotengine/godot/blob/4.5.1-stable/core/templates/rid_owner.h),
en concreto `_allocate_rid`, `get_or_null`, `initialize_rid` y `free`.
La reserva mantiene una marca de no inicializado; el acceso exige su validador,
y liberar invalida el slot. Se adapta la separación entre identidad reservada
y uso autorizado, con validación de generación. Aquí la autorización adicional
procede de un evento nativo real y del ticket exacto, pues una generación
candidata cancelada puede volver a proponerse. No se añade Godot ni otro
asignador, transporte, reloj o planificador.

## Validación y límites

Pasan 174 pruebas dirigidas. La regresión de 150 archivos registra 1687 casos: 1685 aprobados y los dos fallos heredados Carry/Harvest, sin omisiones ni cancelaciones. Build y sintaxis aprobados; los binarios nativos no cambian.

El [recibo](performance/native-resume-attestation-validation-20261114.json)
registra comandos, selección, resultados y hashes. Las pruebas integradas usan
el WASM real con un dispositivo GPU de prueba: suspenden mediante retirada de
chunk, restauran la residencia con otro paquete preparado y reanudan mediante
el nuevo commit condicionado. Verifican que antes de preparado C++ no asigna la
ruta; después se adopta sin otro turno del productor, se selecciona con su
referencia y el reloj causal permite avanzar. Omitir la confirmación directa
impide dibujar. Cambiar el reloj durante la preparación aborta el candidato y
conserva el cuerpo suspendido. Alterar las copias de muestras no cambia C++.

Este incremento conecta el protocolo y su paquete de prueba; todavía no conecta
la preparación de las mallas y bancos reales de trabajador para la reanudación.
La regresión hardware repite únicamente el cuerpo suspendido y la puerta fija
ya soportados. No se le atribuye aceptación gráfica de una reanudación real.

El candidato sigue ligado a una frontera temporal exacta. Falta la política
ordinaria para preparar/reintentar sin detener el avance del resto de la partida.
También faltan el productor ordinario, transiciones de clips y acciones,
consecuencias, persistencia y aceptación integrada. Ninguno de estos permisos
opt-in activa autonomía en la partida ni cierra f-R4 o A/B/C.
