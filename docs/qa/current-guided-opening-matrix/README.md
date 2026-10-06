# Primer brote guiado: 30 combinaciones actuales

6 de octubre de 2026. Regresión sobre b429277, después del ajuste de separación del billboard respecto a edificios. Seed 712 y terreno 4.1.10.3; seis biomas por cinco culturas.

## Prueba de simulación

`node --test tests/guided-opening.test.js`: 30/30 correctas, salida 0. Se revisó el cuerpo de cada prueba: usa la navegación y el terreno originales, genera la ubicación inicial, coloca el centro mediante comando pagado y solicita el punto del tutorial actual. Planta mijo por 5, contrata una joven por 40 y avanza la simulación sin modificar crecimiento, dinero ni posiciones de trabajadores.

Cada caso exige que el trabajador ejecute riegos físicamente apartado del brote (al menos 0,82 m), que todos los riegos obligatorios se completen manualmente, y que se produzca exactamente una caja y una entrega durante el primer día. El saldo parte de 1500, queda en 695 tras centro y semilla, y en 655 tras contratar; la entrega debe sumar el valor real de esa caja. No hay orden manual de cosecha. La prueba falla si no aparece la guía, falta una tarea física o no se entrega la caja.

Esta comprobación del primer brote no es un test económico de plantación intensiva ni de supervivencia de 100 noches. La campaña intensiva independiente sigue ejecutándose.

## Prueba visual nativa

El visor `tests/browser/hands.html` ahora permite seleccionar las cinco culturas, conservando los seis biomas y la misma configuración procedural. Se comprueban en Sabana las cuatro culturas adicionales a Mapungubwe: Saheliana, Suajili, Musgum y Etíope. La comprobación anterior de Mapungubwe en los seis biomas está en [current-world-hands](../current-world-hands/README.md).

`native.json` conserva estados visibles de centro, primer brote y siembra pagada. Las capturas de cada cultura usan cámara diagnóstica de acercamiento: permiten comprobar el contacto de la mano con el suelo junto al centro real; no representan el tamaño normal de gameplay. No se ejecuta Game.tick en el visor. La prueba visual y la de tareas/entrega son independientes.

Pendiente: revisión visual de todas las 30 combinaciones y otras semillas, noche, móvil físico, todas las calidades y aceptación global. No se da por probado este alcance mediante las 30 simulaciones. No se ha publicado a itch.io.

Los logs se conservan comprimidos con hash de los bytes originales en `logs.json`.
