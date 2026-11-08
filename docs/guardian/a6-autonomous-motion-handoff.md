# A6: movimiento confirmado y entrega de pose

> **2026-11-08: A6 reabierto.** Este mecanismo es reproducción histórica y no
> satisface la autonomía por intenciones solicitada. La
> [corrección arquitectónica](intent-route-architecture-correction-20261108.md)
> prevalece sobre cualquier declaración anterior de cierre interno.

## Problema y decisión

La entrada suspendía el intervalo visual y esperaba una confirmación que estaba
detrás de ese mismo intervalo en la cola. El certificador de la superficie
devolvía siempre `null`; activar únicamente el reproductor habría dejado la
partida detenida al primer impacto provisional.

Se consideraron tres opciones:

1. Rebobinar simulación, Rapier y dependencias del comando hasta el instante
   presentado: requeriría otra arquitectura de reconciliación y podría cambiar
   consecuencias ya confirmadas.
2. Saltar directamente al estado más reciente al pulsar: rompería la continuidad
   visual y omitiría recorridos intermedios.
3. Completar el intervalo **ya ejecutado y confirmado**, enviar inmediatamente
   el comando y separar el gesto del guardián de la propiedad del cuerpo.

Se implementa la tercera. No se modifica la autoridad ni se predicen rutas.

## Contrato conectado

- La superficie usa el certificador del grupo de rosters. Exige evidencia
  espacial y de separación, terreno residente con las revisiones exactas,
  participantes completos y observaciones de animación compatibles. Los cambios
  de mundo, eventos, física y pausas conservan la ruta por publicaciones.
- Terreno, efectos y personajes reciben el mismo reloj de presentación. La GPU
  no supera el extremo confirmado. La simulación conserva su reloj independiente.
- El gesto de Attack empieza inmediatamente. La entrega del cuerpo provisional
  se registra por ID y se ejecuta después del commit del intervalo, antes del
  siguiente. Se revalida el objetivo y se conserva el instante original del
  gesto. Rechazo, fallo de transporte o desaparición impiden duplicar el efecto.
- Solo se admiten intervalos de hasta 100 ms **de reproducción real**, calculados
  desde los segmentos del reloj de simulación. Es una cota de latencia de entrega
  visual, no un presupuesto de CPU ni una fragmentación del cálculo del Worker.
  Si una ocultación o un bloqueo retrasa la entrega más allá del primer contacto
  del gesto (240 ms existentes), se omite la caída provisional tardía y se
  consume la pose autoritativa normalmente.
- Los trabajadores en casa y animales desaparecidos permanecen en el contrato
  completo. Solo se excluyen de las consultas geométricas si las muestras prueban
  que permanecieron inactivos, como ya hace la proyección normal de cuerpos.
- Los participantes quietos conservan su pose; los clips precocinados fijan su
  fase cuando procede. Los clips de locomoción todavía sin bake conservan la
  pose de la publicación y pueden usar desplazamiento/orientación GPU. Migrar
  sus poses completas sigue siendo trabajo de B, no una condición circular de A6.
- Una instalación parcial se revierte antes de avanzar el reloj, incluida su
  versión. Una versión ya reproducida no puede rebobinarse mediante esa API.
- Un fallo de validez inesperado durante el intervalo produce un error explícito
  de presentación: no confirma el estado, no envía ACK y no deja comandos
  esperando indefinidamente. El propietario del Worker conserva la responsabilidad
  de recuperación de A7. Los cambios ordinarios de terreno siguen entrando por
  la frontera transaccional; no se publican durante el intervalo activo.

## Validación y alcance

Las pruebas focalizadas cubren reloj compartido, límites temporales, versiones,
rollback de ambos rosters, soporte sobre terreno nativo, participantes ocultos,
entrada aceptada/rechazada con MessageChannel y stream reales, ocultación,
pausas largas e invalidación con comandos pendientes.

`tests/authority-historical-admission.test.js` conecta la captura guardada de
sabana con Wild Engine/WASM, terreno nativo, receptor, soporte, ambos rosters,
certificador y reproductor. Contrasta snapshots y eventos con una autoridad de
referencia y comprueba que no se escriben las raíces entre publicaciones.
La carga de modelos y admisión gráfica están sustituidas en esta prueba: **no
es un render WebGPU ni una aceptación visual de la incursión**.

Resultado: ocho intervalos consecutivos admitidos, 25 actores en el contrato
(ocho bestias y 17 trabajadores en casa), snapshots y eventos idénticos a la
referencia. La batería dirigida pasa 193 pruebas; tras reforzar el rollback de
una sustitución activa, pasan otras 66 comprobaciones de regresión (incluyen una
prueba nueva y repiten parte de la batería anterior). No son muestras de FPS.
Se usa `.cache/tooling/node20.exe`; el registro local de la batería está en
`.cache/a6-integration-tests.tap`. La compilación del perfil `webgpu-worker` se
verifica por separado, sin arrancar una campaña gráfica.

El mecanismo está conectado al perfil temporal explícito del juego, disponible
sin DEV mediante `VITE_PRESENTATION_BACKEND=webgpu-worker` y
`VITE_HISTORICAL_PRESENTATION_RECOVERY=true`. No se activa silenciosamente en
perfiles sin ese contrato ni acredita por sí mismo recuperación completa o
paridad visual. Los
intervalos no certificados mantienen el fallback; por ejemplo, la captura de
manglares con puertas y discos solapados no recibe autorización falsa.

No se han modificado materiales, agua, iluminación, texturas ni políticas de
streaming. No se atribuye mejora de FPS o latencia global a estas pruebas.
