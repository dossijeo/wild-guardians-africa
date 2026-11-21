# f-R4 parcial: revalidación de una propuesta tardía

Fecha: 2026-11-14. Base: `45c569966`. Rama: `codex/guardian-3d-animation`.
Continúa la [reanudación preparada del trabajador original](f-r4-prepared-native-resume-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Todos los padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Cambio

`revalidateNativeGateResumeProposal(ticket)` identifica la propuesta pendiente
por época, sesión, ticket y clase nativa. Su cabecera retenida solo permite
recuperar la identidad del cuerpo suspendido de origen. No sirve para validar
la geometría antigua ni para conceder tiempo o movimiento.

La operación cancela el ticket obsoleto y llama de nuevo al constructor C++
existente, en la frontera causal actual. Este vuelve a comprobar cuerpo,
sufijo, fases, presupuesto, conflictos, reservas, puertas y mundo. No se añade
un planner, ABI, estado paralelo de cuerpos ni una copia del algoritmo en JS.
El resultado nuevo exige la misma identidad suspendida, asignación de origen y
pose de detención. Tiene un ticket posterior y requiere preparar sus recursos.

La revalidación puede hacerse mientras otros cuerpos han seguido ejecutándose.
Las pruebas nativas mantienen un trabajador suspendido y otro en movimiento,
avanzan este último durante cuatro pasos, revalidan en el tiempo nuevo y
confirman después el candidato con la frontera exacta del núcleo. El trabajador
en movimiento continúa; la revalidación no adelanta ni asigna al suspendido.

El commit gráfico condicionado acepta ahora un `proposalTicket` explícito,
además de poder construir una propuesta como antes. Verifica que el ticket
pendiente sea de reanudación y que su slot/generación de origen coincidan con el
handle suspendido solicitado. El ticket anterior no puede consumir el nuevo ni
cancelarlo. Los recursos y el recibo GPU deben nombrar la frontera nueva; no se
retaggea un paquete gráfico anterior como si hubiese sido preparado para ella.

## Fuente y decisión

Se consultó [Recast 1.6.0, DetourCrowd.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp),
`updateMoveRequest`, especialmente los estados de petición pendiente y la
comprobación del resultado contra el corredor vigente antes de adoptarlo.
El agente puede haberse desplazado mientras se resolvía la petición. Se adapta
la revalidación del resultado tardío contra la autoridad actual. Aquí el cuerpo
que pide reanudar sigue fijado, mientras los demás pueden avanzar.

Se reutilizan cancelación y preparación nativas existentes en una misma llamada
síncrona del propietario autoritativo. No hace falta otra operación C++, cola,
temporizador de reintento ni dependencia. Se opta por volver a probar el
candidato completo; no se da por válido el plan anterior por conservar puntos
o una generación candidata coincidente.

## Validación

Pasan 162 pruebas dirigidas. La regresión de 152 archivos registra 1704 casos: 1702 aprobados y los dos fallos heredados Carry/Harvest, sin omisiones ni cancelaciones. Build, sintaxis de HTML y cuatro módulos propios aprobados; no cambian los binarios nativos.

El [recibo](performance/native-resume-revalidation-validation-20261114.json)
registra pruebas, comandos, hashes y alcance.

Las pruebas cubren avance con otro trabajador real en C++, ausencia de
asignación durante la revalidación, conservación de cuerpo/puerta/log,
consumo del candidato nuevo, rechazo de tickets anteriores/ajenos, separación
de clases nativas, datos copiados alterados, cancelación, una generación ya
reanudada, nuevo obstáculo y pthread. El ensayo de transporte usa el candidato
revalidado con el commit condicionado y el dispositivo de prueba; omitir su
confirmación directa sigue impidiendo dibujar.

La [regresión hardware](performance/native-worker-world-owner-revalidated-20261114.json)
extiende el ensayo del trabajador original: crea una propuesta, avanza el reloj
nativo, la revalida y prepara los recursos del ticket nuevo antes del efecto.
Continúa comprobando adopción directa durante el bloqueo del preparador,
movimiento, selección, reutilización de programas, cero recursos posteriores
a preparado y drenaje. Registra 54 dibujos durante el bloqueo y cero recursos posteriores a preparado. Es una renovación explícita; el segundo trabajador de
la prueba nativa no se añade a esta escena hardware.

## Pendiente

La revalidación produce otro candidato de frontera exacta. **No resuelve aún
la admisión gráfica mientras el reloj sigue avanzando durante toda la nueva
preparación.** Si vuelve a avanzar, el candidato nuevo también caduca. No se
congela por ello la simulación ni se renuevan permisos GPU antiguos.

Falta conectar una política ordinaria que complete preparación/adopción bajo
avance continuo, con reutilización de los recursos cuya representación siga
siendo válida y nueva preparación de los que cambien. Tampoco se han conectado
el productor/ejecutor nativos ordinarios, todas las intenciones y acciones,
consecuencias, apoyo actual, persistencia y aceptación integrada A/B/C. Este
incremento proporciona revalidación nativa y su consumo condicionado; no se
presenta como cierre de la política ordinaria ni de f-R4.
