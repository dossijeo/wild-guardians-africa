# f-R4 parcial: propuesta nativa de reanudación sin efecto anticipado

Fecha: 2026-11-14. Base: `92ec41f53`. Rama: `codex/guardian-3d-animation`.
Continúa el [cuerpo y puerta suspendidos preparados](f-r4-prepared-native-suspension-20261114.md)
y el [plan integrado](integrated-gpu-migration-plan-20261104.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Implementado

Se separa la construcción del candidato de reanudación de su publicación.
La ruta inmediata existente y la nueva propuesta llaman al mismo constructor
C++: mismo sufijo, presupuesto, fases acumuladas, colisiones, reservas y
timetable de puertas. También comparten la regla de generación y el lector
de curvas de puerta. No aparece otro planificador.

La propuesta ocupa el ticket pendiente ya existente de mutación. Su clase
interna 13 se distingue de barrera y recursos de mundo 2–11. Mantiene el read set
de tiempo/reloj, cuerpos, entidades, hechos, intenciones, reservas, puertas y
mundo. Las APIs de otra clase no pueden consumirla. Cancelación, dependencia
alterada o recibo incorrecto descartan el candidato y conservan el cuerpo
suspendido. El candidato temporal sustituirá su slot original al confirmar;
antes no es una asignación ni un handle ejecutable.

El bridge expone preparación, captura y cancelación del borrador. Los datos
copiados contienen el handle suspendido de origen, la generación candidata,
las secuencias ya existentes de origen/control, puntos, muestras de 16 columnas
y curvas propuestas de puerta. No inventan el número de secuencia del futuro
RouteAssigned. Su tipo explícito `native-route-resume-proposal` se rechaza como
`NativeRoutePresentation`. Modificar sus arrays no altera C++ ni otra captura.

El ABI nativo de commit valida la frontera exacta antes de publicar mediante el
ejecutor existente. Las pruebas ejercitan ese commit del núcleo con su tupla
nativa; eso no constituye un recibo GPU ni una autorización de presentación.
La integración gráfica condicionada y la confirmación directa de la nueva
asignación son el siguiente paso, todavía sin activar en el bridge de producto.

## Referencia consultada

[Recast 1.6.0, DetourCrowd.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp),
`updateMoveRequest`, conserva solicitudes pendientes, limita el trabajo de la
cola y comprueba el resultado frente al corredor vigente antes de instalarlo.
En particular, contrasta el punto de unión porque el agente puede haber
cambiado mientras se procesaba la petición. Se adapta la separación entre
resultado pendiente y adopción validada, usando el ticket/read set existentes.
No se añade su cola ni se cambia la navegación de Wild Guardians. El cálculo
de movilidad y de puertas sigue siendo el C++ ya presente en el repositorio.

## Validación

Pasan 40 pruebas dirigidas. La regresión amplia de 149 archivos registra
1.677 casos: 1.675 aprobados y los dos fallos heredados Carry/Harvest, sin
omisiones ni cancelaciones. Compilan standalone y pthread; build aprobado
en 47.52s. Pasan sintaxis 308 scripts inline de 366 HTML y los
cuatro módulos JS propios. El [recibo](performance/native-resume-proposal-validation-20261114.json)
registra selecciones, comandos, ABI y hashes anteriores a la regresión GPU.

Las siete pruebas nuevas verifican ausencia de cambios de cuerpo, puerta, log y
permisos durante la preparación; copia de recursos; generación candidata sin
consumir; paridad con la reanudación inmediata; commit de un uso; aislamiento
entre clases/tickets; rechazo por reloj/cuerpos/recibo; obsolescencia por una
reanudación posterior y publicación pthread. Las doce pruebas anteriores de
reanudación siguen comprobando fases de marcha, carrera, carga, huida y esperas.

La [regresión NVIDIA Turing](performance/native-resume-proposal-suspension-regression-20261114.json)
repite el caso ya preparado de trabajador suspendido y puerta fija, usando
los nuevos binarios y el lector de curvas compartido. Conserva 44 dibujos
del mundo nuevo durante el bloqueo del preparador, cero recursos posteriores
a preparado, texturas/programas reutilizados y drenaje real al cerrar.
No crea una propuesta de reanudación en ese ensayo: no se le atribuye
validación gráfica de la funcionalidad que sigue pendiente.

## Pendiente

Falta admitir gráficamente la nueva referencia de propuesta y relacionarla,
por el canal directo, con el RouteAssigned real. La preparación no debe autorizar
una asignación cancelada solo porque se reutilice su generación candidata. Faltan
la grabación/adopción del paquete de reanudación y el arranque causal del cuerpo
tras esa adopción. El wrapper inmediato anterior sigue siendo un componente
opt-in; no se presenta como una reanudación gráfica preparada.

El read set actual es de una frontera exacta: si la simulación avanza mientras
se prepara el recurso, la propuesta caduca. Aquí no se implementa ni valida la
política ordinaria para preparar/reintentar sin detener el avance del resto de
la partida. La alimentación/ejecución ordinarias, todas las intenciones,
acciones/consecuencias, persistencia y aceptación integrada siguen pendientes.
Este incremento no cierra f-R4 ni A/B/C.
