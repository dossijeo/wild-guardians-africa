# Animación precocinada tardía con trayectoria GPU

Una bestia que ya tiene una trayectoria GPU puede incorporar más tarde su caminata precocinada sin sustituir el rig. La extensión compone los dos grafos sobre las nuevas mallas, prepara las alternativas antes de publicarlas y conserva la transformación temporal en el proxy de selección. Las cargas de textura se propagan a las réplicas y la cancelación retira los recursos pendientes.

La batería local incluye 150 pruebas de admisión, cancelación, picking, movimientos históricos y rigs, además de generación WGSL de color y sombra con un rig real sin dispositivo. Esto no demuestra compilación física, equivalencia visual ni rendimiento en la GPU. Quedan pendientes las demás acciones y transiciones de B4 y la validación integrada de C.
