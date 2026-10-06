# Animales repetidos tras consumir el rig de reserva

El fixture admite `copies=1..4`, repitiendo el grupo de cinco especies o la especie seleccionada. Comprueba que cada especie consume exactamente una reserva, tiene modelos/esqueletos/texturas de huesos independientes y comparte geometría/materiales. No modifica la distribución de incursiones del juego.

## Dos y cuatro instancias por especie

Ambas pruebas usan WorldScene real en Gran Cañón, seed 712, cultura Mapungubwe, calidad media y navegador de escritorio. Diez y veinte animales terminan listos, sin nuevas descargas de GLB, sin nuevos programas de sus materiales y sin avisos/errores de consola capturados. Los informes incluyen los UUID de recursos; todas las instancias de la prueba de veinte tienen esqueleto y textura de huesos.

El caso de veinte registra quince llamadas adicionales a `AnimalPreload.create`, después de la carga inicial. El intervalo síncrono de cada llamada está entre 12,8 y 18,2 ms. La suma ronda 238 ms y muestra trabajo de creación concentrado durante la aparición, aunque los materiales y modelos ya están cargados. El intervalo incluye asignaciones, preparación de animaciones, pose, muestras del suelo y bounds; no desglosa cada componente ni acredita CPU exclusiva en hardware aislado. La suite completa se ejecutaba en paralelo.

`take()` devuelve una promesa y sus tiempos incluyen planificación y espera entre tareas; no se deben interpretar sus valores de unos 93 ms en la prueba de diez como el coste síncrono de crear un rig. El fixture ahora mide `create()` por separado.

Siguiente corrección de runtime: reservar anticipadamente el número de rigs que necesita la incursión prevista, repartiendo las creaciones entre frames y manteniendo un límite ligado al plan. Después verificar uso/liberación, cancelación, preparación GPU de las reservas y el coste al aparecer. Esa corrección todavía no está implementada por esta prueba.

El test unitario añadido comprueba cuatro `take()` concurrentes, una sola reserva consumida, una descarga y recursos geométricos/materiales compartidos. Los cuatro tests de AnimalPreload pasan. Estas apariciones controladas no prueban combate, audio ni campañas largas de grupos de veinte animales.
