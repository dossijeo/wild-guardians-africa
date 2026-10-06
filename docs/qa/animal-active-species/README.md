# Otras especies durante una incursión restaurada

2026-10-06. Pruebas del fixture `animal-preload.html` sobre `5043385`, Gran Cañón, seed 712, Mapungubwe, calidad media, navegador de escritorio. Parámetros comunes: `load-active=1&copies=4&motion=1&timing=1&biome=gran-canon`; `attack-species` selecciona cada especie.

Se utilizan centro y brote pagados, contratación vacía, foco de cámara nativo antes de generar el ataque y serialización/deserialización real de la incursión activa. La composición de cuatro animales por especie es controlada, no una noche introductoria natural. El montaje y sus límites se explican en [animal-active-motion](../animal-active-motion/README.md), donde se verifica el facóquero.

| Especie | Modelos preparados | Primer golpe al centro | Tiempo simulado hasta el golpe |
| --- | ---: | --- | ---: |
| Hiena | 4 | 600 → 575 HP | 18,20 s |
| Búfalo | 4 | 600 → 565 HP | 18,20 s |
| León | 4 | 600 → 560 HP | 18,20 s |
| Rinoceronte | 4 | 600 → 540 HP | 18,00 s |

En las cuatro pruebas:

- La incursión mantiene su estado lógico al resolver WorldScene.load.
- Los cuatro modelos consumen reservas, mantienen esqueletos/texturas de huesos privados y comparten geometría/materiales por especie.
- Se registra AnimalLogicalHit. Los dos animales que siguen presentes tienen meshes visibles y bounds dentro del frustum; los otros dos ya están `gone` y se han retirado de la escena.
- Durante el recorrido no se crean nuevos rigs ni programas de materiales de animales. Las descargas de GLB permanecen en siete.
- No se registran errores de aplicación ni avisos/errores de consola.

Los informes originales se guardan por especie junto con sus consolas y capturas de inspección. Las capturas acercan la cámara al primer animal, que camina hacia el cultivo; el autor del primer golpe al centro es el segundo animal. `summary.json` contiene las comprobaciones estructuradas de los cuatro informes.

Hiena y búfalo se ejecutaron parcialmente a la vez; león y rinoceronte después. Había procesos de campaña ejecutándose en el equipo. Los tiempos CPU/RAF retenidos en los informes no se usan como benchmark comparativo ni como aceptación de teléfono físico.

Con la prueba previa de facóquero, las cinco especies tienen evidencia de carga, movimiento, contacto y modelos presentes después de restaurar en esta combinación concreta. Quedan otros biomas/culturas/calidades, dispositivo físico, escucha de audio y presupuestos de memoria. Esta ronda añade evidencia; no cambia código del juego.
