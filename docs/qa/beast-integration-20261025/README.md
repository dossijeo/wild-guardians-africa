# Bestias integradas: revisión final

Los cinco modelos de codex/beast-models están integrados en codex/global-visual-lab. Cabezas elevadas conservando el movimiento, apoyo corregido sin margen duplicado ni deformación del pie por la pantorrilla, y acercamiento suave de la cámara de incursión. PR #215 en borrador; sin fusión a main.

| Especie | Animaciones completas | Detalle de patas | Interacción real |
|---|---|---|---|
| warthog | [Vídeo](warthog/final/warthog-animations.mp4) | [Marcha de perfil](warthog/feet-final/side-Walking-sequence.jpg) | [Escudo](warthog/final/raid-shield.png) |
| hyena | [Vídeo](hyena/final/hyena-animations.mp4) | [Marcha de perfil](hyena/feet-final/side-Walking-sequence.jpg) | [Escudo](hyena/final/raid-shield.png) |
| buffalo | [Vídeo](buffalo/final/buffalo-animations.mp4) | [Marcha de perfil](buffalo/feet-final/side-Walking-sequence.jpg) | [Escudo](buffalo/final/raid-shield.png) |
| lion | [Vídeo](lion/final/lion-animations.mp4) | [Marcha de perfil](lion/feet-final/side-Walking-sequence.jpg) | [Escudo](lion/final/raid-shield.png) |
| rhino | [Vídeo](rhino/final/rhino-animations.mp4) | [Marcha de perfil](rhino/feet-final/side-Walking-sequence.jpg) | [Escudo](rhino/final/raid-shield.png) |

Cada vídeo contiene marcha, carrera y cuatro ataques completos de día y de noche, con vistas frontal y trasera. Son frames deterministas del renderer real a 30 fps; no miden rendimiento. Los informes video.json identifican el hash del asset instalado.

Validación: 125 pruebas dirigidas pasan; auditoría de 129 fases por clip de las cinco especies; validación GLTF sin errores y geometría/animación comprimidas exactas; Vite build y paquete web correctos (973 archivos, 465.403.353 bytes, 17 GLB runtime). Incursión con movimiento, ataque y primer impacto comprobada para cada especie. Escudo activado con botones y clics reales desde el juego, sin llamadas directas a cast.

[Medidas de apoyo y límites](FOOT-SUPPORT.md). [Corrección de cabeza](HEAD-POSTURE.md). [Progreso](PROGRESS.md). [Informe final verificable](FINAL-VALIDATION.json).

En vertical 390×844, [el escudo funciona](rhino/final-portrait/raid-shield.png), pero el HUD tapa parte del rinoceronte. El ajuste de suelas no incluye IK para pendientes: se midió una penetración local máxima de 7,8 mm en una esquina del rinoceronte. Las comprobaciones visuales y muestras no certifican ausencia de toda intersección posible. No se modifican reglas de combate, navegación o colocación de escudos.

Reproducción: arrancar Vite, definir WG_QA_URL y WG_BEAST_QA_OUT, ejecutar tools/render_beast_video.mjs, tools/capture_beast_replacement.mjs y tools/experiments/check-beast-raid-ui.mjs para cada especie. Las partidas controladas se regeneran con tools/experiments/create-beast-raid-fixture.mjs; fijan únicamente especie y momento de la siguiente incursión sobre una apertura nativa con costes reales.

Siguiente pendiente del usuario: investigar el lago excesivo de Manglares mostrado durante la transición de carga. Se mantiene separado de esta integración de bestias.

También queda anotada la corrección del tutorial en portrait: globo abajo y
guardián encima para que no quede tapado, conservando accesibles los controles.
