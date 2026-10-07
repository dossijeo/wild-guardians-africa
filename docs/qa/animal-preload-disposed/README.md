# Reserva de animales cerrada: sin nuevas cargas tardías

AnimalPreload.warm y take devuelven null inmediatamente si la reserva ya está disposed. Antes, un caller tardío podía resolver el descriptor e iniciar Assets.model pese a que ningún rig pudiera utilizarse. No se cancelan ni alteran las cargas compartidas que ya estaban en marcha; las protecciones existentes impiden crear un rig cuando terminan después del cierre.

La regresión verifica conjuntamente warm/take para especies válidas y desconocidas después de dispose: cero consultas de descriptor, cero descargas, cero creación de rigs, mapa de entradas vacío y ninguna reserva/spare. Se mantienen las pruebas de descarga deduplicada, concurrencia, retiro de esqueletos privados, reserva escalonada, fallos/reintentos y obsolescencia durante preparación GPU.

39 tests aprobados (`node --test tests/animal-preload.test.js tests/animal-actions.test.js`), incluidos originales de animación/altura de animales. Build correcto en 12,68 s con el aviso existente de chunk grande. Comprobación posterior del paquete correcta: 641 archivos, 859 referencias relativas y 20 GLB runtime sin duplicados originales. Logs completos comprimidos y hashes de fuentes conservados.

El caso de llamada tardía utiliza recursos instrumentados para comprobar que no se invocan; no reproduce una navegación móvil ni acredita menor RAM, GPU o frametime. No se da por completada la aceptación física de la primera incursión ni la recuperación de contexto WebGL por este cambio.
