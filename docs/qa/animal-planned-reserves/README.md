# Reservas de rigs ligadas a la incursión prevista

AnimalPreload conserva una reserva base por especie y amplía el número conforme al grupo nocturno previsto. Cada rig adicional se crea tras ceder un frame; no se preparan varios en la misma iteración. WorldScene sube su textura de huesos y espera la fence GPU antes de añadirlo a las reservas disponibles. Geometría, materiales y clips continúan compartidos.

Consumir un rig decrementa la demanda restante para evitar reponer el grupo entero mientras llegan los animales. Un plan nuevo invalida la preparación anterior y libera excedentes. Tras cerrar la incursión, el grupo completado vuelve a la reserva base. El día forma parte de la clave para renovar reservas aunque se repita la misma composición. No se cambia el plan durante una incursión activa. Los errores de preparación tienen reintento con espera de tres segundos y una generación obsoleta no publica su error.

## Prueba de veinte animales

El fixture `plan-reserves=1` instala una composición controlada de cuatro animales por cada una de las cinco especies, pasa por WorldScene.sync y espera su preparación real. No adelanta el reloj simulado. En Gran Cañón, seed 712, Mapungubwe, calidad media:

- Se preparan quince rigs adicionales, uno por iteración/frame, además de las cinco reservas originales.
- Los veinte animales consumen reservas; durante la aparición no se ejecuta ninguna llamada a AnimalPreload.create.
- Cada animal tiene modelo/esqueleto/textura de huesos propios y comparte geometría/materiales con los de su especie.
- No hay nuevas descargas de GLB, programas nuevos de animales ni errores/avisos de consola capturados.

La prueba anterior sin preparación anticipada concentraba 238 ms en quince llamadas de creación. En esta ejecución las llamadas se desplazan a la preparación, con unos 14–20 ms por rig. Esto elimina ese trabajo concentrado de la aparición, no el coste individual ni todo el trabajo de WorldScene.actor. La suite completa local se ejecutaba en paralelo; no es una comparación de FPS/GPU aislada ni un resultado de móvil físico.

Diecinueve tests focalizados pasan para reserva/concurrencia, reducción de demanda al consumir, cambio de plan y liberación de excedentes, cancelación durante preparación, fallo GPU y reintento, recursos privados, espera GPU y cancelación de carga. Los informes y capturas están junto a este README. La compilación de producción pasa.

Una incursión activa invalida la clave para que, al terminar, se reponga la demanda del plan pendiente incluso si una incursión diurna no prevista consumió sus reservas. No se reinicia el plan mientras dura el ataque.

Pendiente: reserva bajo reloj de gameplay real, cambios de día y recarga de guardado en el navegador, incursiones diurnas cuya composición se decide al comenzar, demás culturas/calidades/biomas y memoria en móvil. Si un plan llega demasiado tarde o falta una reserva, take conserva su creación inmediata como fallback para permitir el ataque; no se afirma que ese caso deje de producir un pico.
