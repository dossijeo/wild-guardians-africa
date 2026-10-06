# Movimiento y contacto después de restaurar una incursión

Validación sobre `6898d5e` con el fixture `animal-preload.html?load-active=1&copies=4&attack-species=warthog&motion=1&timing=1&biome=gran-canon`. Gran Cañón, seed 712, Mapungubwe, calidad media, navegador de escritorio.

Se paga un centro y un brote, se confirma una contratación vacía y se llega a la noche mediante Game.tick. La cámara y el área activa se establecen mediante la misma función de foco y región que usa producción antes de disparar el grupo controlado de cuatro facóqueros. El ataque se serializa/deserializa ya activo y WorldScene.load reconstruye sus modelos. Esta variante no usa IndexedDB ni el menú; esa ruta se verifica en [animal-active-continue](../animal-active-continue/README.md).

## Resultado

- Estado lógico de la incursión idéntico al resolver la carga.
- Cuatro modelos distintos obtenidos de reservas; esqueletos/texturas de huesos privados y geometría/materiales compartidos.
- Tras 363 pasos de 0,05 segundos, un golpe reduce el centro de 600 a 580 HP. Se registra AnimalLogicalHit y un efecto de ataque de facóquero con 16 sprites.
- Dos animales continúan presentes: ambos tienen meshes visibles y bounds que intersectan la cámara. Otros dos ya están `gone` y sus modelos se han retirado correctamente.
- Siete descargas de GLB antes y después del recorrido, ninguna creación adicional de rigs ni programa nuevo de materiales de animales.
- Consola de avisos/errores vacía. El acercamiento posterior conserva el estado lógico.
- Pasan 18 tests de restauración lógica de incursiones y carga de animales guardados. El cambio de este commit afecta al fixture y la evidencia, no al runtime.

`contact.png` muestra los dos animales junto al centro; `inspection.png` acerca la cámara al primero, que sigue caminando hacia el cultivo. La captura de inspección no muestra al autor del golpe: el informe identifica a `animal-7` como atacante del centro y a `animal-6` como el animal inspeccionado.

El intento inicial generaba el ataque sin la vista de cámara de producción y los animales se retiraban sin objetivos. Corregido el montaje, otra comprobación exigía que también fueran visibles los animales `gone`; `initial-check-failure.json` conserva ese diagnóstico. La condición final verifica los animales que aún pertenecen a la escena, sin alterar navegación ni comportamiento de retirada.

Los JSON originales, `summary.json` y las capturas están en esta carpeta. Es una prueba controlada de una especie en un bioma y una cultura; no acredita todas las combinaciones, escucha de SFX, frametime de teléfono ni RAM/VRAM.
