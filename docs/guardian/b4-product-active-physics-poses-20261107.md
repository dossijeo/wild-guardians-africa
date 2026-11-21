# Publicación de poses físicas activas

El arranque temprano WebGPU con proyección HUD activa `compactPhysicsPoses`:
la autoridad publica las poses físicas y las salidas de recuperación activas,
sin serializar los huesos de bestias que no tienen una pose física. El receptor
ya ignoraba esas poses inactivas. Cuando una consulta de terreno solicita la
representación completa, se mantiene la excepción existente. Los perfiles
heredados o de diagnóstico conservan su configuración anterior, así como la
opción de activar explícitamente el formato compacto.

Las pruebas cubren selección de perfil, receptor con caídas y recuperaciones
mezcladas con poses inactivas, y un rig real antes y después de una transición
de recuperación. También pasan las pruebas de cola y recepción confirmada. No
se han medido bytes, CPU ni tiempos de fotograma en una partida; el cambio no
demuestra por sí mismo una mejora de fluidez ni habilita la reproducción
histórica durante física activa.
