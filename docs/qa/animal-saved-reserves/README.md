# Grupo pendiente al continuar un guardado

WorldScene.load espera la reserva del grupo nocturno pendiente antes de warmAnimalGpu. Los rigs se crean uno por frame bajo la pantalla de carga; la preparación GPU posterior incluye las reservas completas. Si el plan ya terminó o no existe, se conserva la reserva base. El pool no se serializa: se reconstruye desde el plan lógico del guardado.

El fixture `load-reserves=1` paga un centro, un cultivo legal y una contratación vacía. Avanza la simulación a la noche, instala una composición controlada de cuatro animales por cada especie y avanza hasta una décima de segundo antes de su llegada. Serializa/deserializa usando las funciones reales de snapshots, crea WorldScene desde ese estado y comprueba que el plan permanece idéntico y todos sus rigs están preparados al resolver load.

La composición de veinte animales es una prueba de estrés controlada, no una composición introductoria natural. El disparo del plan restaurado se realiza mediante Game.tick(.2), sin llamar a spawnRaid directamente. La prueba no usa el repositorio IndexedDB ni los botones del menú Continuar.

## Evidencia

Gran Cañón, seed 712, Mapungubwe, calidad media, escritorio:

- Veinte reservas al terminar load y veinte animales listos después del avance del reloj.
- Ninguna creación adicional de rigs al aparecer; todos consumen reservas de carga.
- Modelos, esqueletos y texturas de huesos privados; geometría/materiales compartidos por especie.
- Ninguna descarga adicional de modelos ni programa nuevo de materiales de animales.
- Resultado ok y consola de avisos/errores vacía.

Los informes y la captura están junto al README. Veinticinco tests focalizados de reservas/programación, cancelación de carga y preparación GPU pasan. No se afirma ausencia de cualquier tirón, presupuesto de RAM ni aceptación de móvil físico. La recarga desde el menú real se verifica posteriormente en [animal-continue-menu](../animal-continue-menu/README.md). Quedan pendientes guardados con incursión ya activa y comparación en todos los biomas/calidades.
