# Sombras proyectadas por el relieve residente

Prueba separada sobre el candidato de relleno restringido a sombras. Reutiliza las mallas originales del terreno como emisores de sombra en el pass solar existente. No modifica alturas, navegación, topología ni siluetas y no crea mapas adicionales.

48 capturas reales de WorldScene, semilla 712, calidad media, 1280×720, dos cámaras y día/noche. `captures.json` y `pixel-comparison.json` conservan evidencia y errores, sin ocultar un 404 de recurso al cargar la primera escena (URL no capturada en esa ejecución).

## Lectura visual provisional

- Cañón: aparece la sombra extensa que faltaba al pie de la pared; 19,20 % de píxeles cambia más de 3/255 en vista amplia diurna. El beneficio es real, pero el encuadre de fixture todavía oculta parte de la escena y no sustituye una cámara de campaña. La noche también cambia (17,87 %); hay que revisar su lectura antes de adoptar.
- Sabana: no hay mejora perceptible en estos encuadres; diferencias inferiores a 0,002 %.
- Gran Río, Manglares y Volcanes: sin cambios en la vista amplia diurna comparada. No generalizar el coste a estos biomas sin beneficio visible.
- Desierto: cambio localizado (1,08 %), pendiente de revisión específica.

## Coste y límites

La caché de sombras hace que las capturas estáticas mantengan los draws y triángulos del último frame. **Eso no significa que los nuevos casters sean gratuitos.** El siguiente benchmark desactiva la caché en ambas variantes para medir cada pass de profundidad. Cañón usa 13 chunks y 59.904 triángulos de terreno residente; Sabana, 25 chunks y 115.200 triángulos. La cámara solar recorta el subconjunto dibujado.

El contador Three de geometrías aumenta (Cañón 105 → 109; Sabana 124 → 137): algunos buffers residentes antes no usados por la cámara de color entran en el pass solar y se suben. Aunque no se crean mallas nuevas desde JS, existe un coste de recursos GPU; no se afirma igualdad de VRAM ni descarga menor.

No adoptada todavía. Pendientes coste con actualizaciones de sombra, cámara de campaña, límites del mapa solar, transición de chunks y calidad baja/alta. El experimento no aplica automáticamente el flag a nuevos chunks; no presentarlo como implementación de streaming terminada.

## Coste medido con caché desactivada

ABBA BAAB dentro de una página, Cañón, 180 frames por muestra, cuatro muestras por variante/fase. Ambas variantes recalculan el mapa solar en cada frame. Referencia = relleno local sin casters de terreno.

| Fase | GPU referencia → terreno | CPU envío referencia → terreno |
|---|---:|---:|
| Día | 15,800 → 16,119 ms | 5,486 → 5,513 ms |
| Noche | 15,993 → 16,634 ms | 5,007 → 5,143 ms |

139 → 159 draws y 1.222.467 → 1.314.627 triángulos enviados por frame, contando los passes. Simulación sin cambios según todos los informes. El contador difiere del total residente porque depende del encuadre solar y los passes. Logs crudos en `paired-terrain.json`.

Decisión: habilitar **solo como opción experimental explícita para Cañón**, por mejora amplia visible también en cámara de campaña. Excepción al presupuesto inicial: +0,641 ms nocturnos, aproximadamente 4 % sobre el frame de referencia en esta prueba, y +20 draws en actualización. No se oculta ni se declara aprobado el límite de +0,5 ms. No extender a biomas sin beneficio. La futura integración se activa con `visualLab=global-lighting`; la ruta sin parámetro conserva comportamiento original.
