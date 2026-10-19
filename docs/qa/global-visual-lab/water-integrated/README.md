# Agua integrada en la opción experimental

Activación: `?visualLab=global-lighting`. Sabana, Gran Río, Manglares y Cañón utilizan una superficie irregular con mapa de pendientes compartido. Desierto y Volcanes conservan su agua/lava y no asignan esta textura. Sin parámetro se conserva el renderer original.

La superficie conserva geometría, recortes, siluetas, reloj visual, sol y sombras existentes. Se elimina el dibujo de bandas anchas; la tinta profunda y la reflexión HDR definen el color. Una textura RG8 256×256 aporta dos escalas de pendiente: 128 KiB de datos, ~171 KiB nominales con mipmaps, sin descargar assets externos. No se midió VRAM física. Las variantes sinusoidales y las analíticas más caras quedan documentadas en las carpetas water-ripples, water-reflections, water-surface y water-surface-lean.

## Evidencia

- 48 capturas integradas de seis biomas: 24 parejas con cámara/hora iguales. La referencia base-water conserva toda la iluminación global y desactiva solo el agua nueva mediante interceptación local de la respuesta de scene.js.
- 16 capturas de partidas iniciadas desde el menú, en campaign/: cuatro biomas, día/noche, semilla 712, calidad media, cultura Mapungubwe y reloj de agua fijado en cero. HUD/tutorial permanecen visibles. Cámaras, número de estructuras y plantas coinciden por pareja; sin errores registrados en estas partidas. Son partidas pausadas, no una prueba de combate o navegación.
- Los draws y triángulos enviados coinciden en las 24 parejas. Los cuatro biomas modificados añaden una textura; controles añaden cero. El contador de geometrías subidas de Cañón difiere en una unidad, aunque no cambia la geometría del agua ni sus draws/triángulos. No convertir contadores de una captura en prueba de ausencia de fugas.
- Build correcto (404 módulos), 23 pruebas de materiales, caché, sombras y profundidad. La prueba específica verifica ruta por defecto, exclusión de lava, claves de programa, reloj, recorte y liberación compartida.

## Streaming y origen

En streaming/ se comprueba Gran Río, calidad media, desplazamiento 0 → +96 → 0 m. Los 8 → 5 → 8 materiales de agua usan la misma textura; ninguno queda sin binding. La textura emite un único dispose al cerrar WorldScene. Los contadores globales de texturas varían (78 → 75 → 82): esta prueba no demuestra ausencia de fugas en el resto del renderer.

Recentrar el origen sin mover cámara ni reloj produce diferencias superiores a 3/255 en 0,01877 % de píxeles diurnos y 0,01204 % nocturnos; diferencia media por canal 0,00557 y 0,00215 sobre 255. No afirmar identidad binaria. El informe conserva el origen y los encuadres. Hay un 404 de primera carga sin URL identificada en algunas fixtures; no hay errores JS/shader registrados.

## Recomendación y límites

Conservar solo como opción experimental. El [coste QA del mapa](../water-surface-map/PERFORMANCE.md) se mide sobre grandes cuerpos de agua, no solo la charca de cámara normal. Las ocho medias de cuatro biomas quedan dentro del umbral de +0,5 ms; máximo aumento +0,250 ms GPU en Sabana nocturna, con variación entre repeticiones. No suma automáticamente una aprobación del presupuesto de iluminación/sombras global, que seguía pendiente.

Las orillas siguen siendo duras, Manglares necesita mejor integración con lodo y raíces, y la noche conserva superficies demasiado planas en algunos encuadres. No hay reflexión de objetos en pantalla ni nueva espuma de costa. No se ha validado un recorrido continuo largo, todas las calidades ni todos los dispositivos. La calidad objetivo de los mockups no está alcanzada.
