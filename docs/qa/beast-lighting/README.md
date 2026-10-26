# Contraste local de las bestias

Las cinco especies reciben una luz principal cálida orientada hacia cámara, relleno frío tenue y un borde suave en su material. Se conserva sombra en el cuerpo para dar volumen, con saturación y contraste moderados. La respuesta cambia entre día y noche. No se crean luces ni se cambia exposición, cielo, terreno, edificios o vegetación.

`prepareAnimalModel` marca exclusivamente materiales de bestias. `beast-lighting.js` incorpora la respuesta en AfricanToon, reutilizando dirección solar, noche y visibilidad de sombras. Los materiales del entorno conservan el shader anterior. El modificador se activa por defecto, incluido en modelos precalentados y reutilizados. `?beastLighting=legacy` permite comparar el estilo previo.

## Comparaciones integradas

[Datos y comprobaciones](comparison.json): 30 pares A/B, con idéntica escena pausada, pose, cámara y hora. Facóquero/hiena en seis biomas y las otras tres especies en Gran Cañón, con dos distancias. Solo cambia el uniforme del material. Se comprueban luces y exposición idénticas, ausencia de errores WebGL y diferencia visible en el animal.

La comparación de píxeles usa PNG originales, antes de codificar JPEG. Se tolera un nivel RGB y como máximo el 0,01 % de píxeles exteriores para pequeñas variaciones de rasterizado en bordes de vegetación; los recuentos exactos constan en el informe. No se afirma identidad absoluta de todos los píxeles del fondo.

| Escena nocturna | Antes | Después |
| --- | --- | --- |
| Facóquero, Gran Cañón | [Anterior](warthog-gran-canon-game-before.jpg) | [Nuevo](warthog-gran-canon-game-after.jpg) |
| Hiena, Gran Cañón | [Anterior](hyena-gran-canon-game-before.jpg) | [Nuevo](hyena-gran-canon-game-after.jpg) |
| León | [Anterior](lion-gran-canon-game-before.jpg) | [Nuevo](lion-gran-canon-game-after.jpg) |
| Búfalo | [Anterior](buffalo-gran-canon-game-before.jpg) | [Nuevo](buffalo-gran-canon-game-after.jpg) |
| Rinoceronte | [Anterior](rhino-gran-canon-game-before.jpg) | [Nuevo](rhino-gran-canon-game-after.jpg) |

Generador: `node tools/capture_beast_lighting.mjs`, con Vite, Playwright y Chrome. `WG_SPECIES`, `WG_BIOMES` y `WG_QA_URL` limitan la revisión. Pruebas del aislamiento en `tests/african-toon.test.js`.
