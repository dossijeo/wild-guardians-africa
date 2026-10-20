# Roca estratificada integrada en global-lighting

20/10/2026. Se conserva el material de color Cliff Side con franjas atenuadas para las paredes del Gran Canon, exclusivamente con ?visualLab=global-lighting. [Fuente CC0 y hashes](../canyon-stratified/SOURCE.md). Renderer por defecto y otros cinco biomas no cargan el mapa.

BiomeGround posee una copia del mapa prestado por Assets y la comparte con todos los materiales residentes y el horizonte. Los chunks nuevos reciben el mismo uniforme al crearse, sin recorrer materiales cada frame. AfricanToon aplica la proyeccion dominante solo al material del Canon con ese uniforme. El cache key distingue la variante. No modifica vertices, siluetas, simulacion, navegacion ni balance. No se incluye el mapa normal externo: su aporte visible era pequeno en las vistas comprobadas.

## Capturas

72 capturas de fixture real WorldScene, 36 parejas en seis biomas: semilla 712, calidad media, 1280 x 720, camaras de juego/baja/lateral y horas 150/350 iguales. comparison.json comprueba igualdad de camara, objetivo y hora, y cliffMap solamente en Canon integrado. Cero draws y triangulos adicionales. Texturas +1 en Canon, 0 en los otros biomas. Variacion de contador de geometria -6 en las seis capturas de Gran Rio, cero en las otras; la implementacion no crea ni modifica geometria.

- [Canon antes](canyon-base-canyon-side-day.png) / [integrado](canyon-global-lighting-side-day.png).
- [Canon noche](canyon-global-lighting-low-night.png).
- [Sabana control](savanna-global-lighting-low-day.png).
- [Gran Rio control nocturno](grand-river-global-lighting-side-night.png).

[Campana integrada](campaign/captures.json): doce capturas de una partida arrancada desde el menu, ambas orillas y vista oblicua, dia/noche. Semilla 712, pausa QA y reloj visual fijo, sin entidades anadidas. Seis parejas verificadas con camara, objetivo, hora y poblacion iguales. Cero draws/triangulos extra; el contador global de texturas da -1 en primera vista y +1 en las otras (cargas/cache entre paginas, no ahorro del material). Cero errores de pagina o HTTP registrados en campana. El fixture registra un 404 sin URL identificada en la primera pagina base.

[Antes en campana](campaign/gran-canon-base-east-day.png) / [despues](campaign/gran-canon-candidate-east-day.png). [Orilla opuesta de noche](campaign/gran-canon-candidate-west-night.png). No se observan costuras nuevas en estas tres vistas; no es prueba de todos los angulos ni semillas.

## Recursos, rendimiento y pruebas

Un JPG original de 859.756 bytes, 1024 x 1024, compartido. RGBA8 con mipmaps implica aproximadamente 5,33 MiB nominales, no VRAM medida. Una lectura por fragmento de pared; no nuevo draw call ni geometria. [ABBA del candidato equivalente](../canyon-soft-bands/performance-summary.json): -0,066 ms GPU dia/+0,461 noche. La base diurna deriva de 15,102 a 16,755 ms; no afirmar aceleracion. Ensayos anteriores dieron mas coste. En esta ronda integrada se verificaron contadores y aspecto, no se repitio medida temporal; el presupuesto total de global-lighting sigue pendiente.

streaming.json: recorrido 0/+96/-96 m, claves de chunks diferentes, 26/28/26 materiales y un unico mapa compartido en todos. Doce pruebas pasan: limites por bioma y opt-in, shader residente/horizonte, bandas activas, propiedad/liberacion unica, materiales clonados y pruebas de suelo existentes. Build Vite correcto, avisos existentes de far-atmosphere y bundle >500 kB. No se hizo prueba de sesiones largas ni de todas las calidades.

## Recomendacion y limites

Conservar en la opcion experimental: las fracturas sustituyen las paredes de bandas planas y mantienen calidez y sombras. Siguen visibles terrazas trianguladas, repeticion y una transicion suave pero artificial en la base de la pared. No equivale a la calidad de los mockups ni aprueba el conjunto del renderer. Volver a mejoras globales de vegetacion y legibilidad nocturna; revisar el coste total antes de promover o fusionar.

Reproduccion: node tools/experiments/capture-canyon-integrated.mjs; WG_CANYON_INTEGRATED=1 con capture-campaign-canyon.mjs; node tools/experiments/check-canyon-integrated-streaming.mjs. La ruta QA canyon-qa-route.mjs desactiva solo la carga nueva para obtener el antes sin cambiar archivos runtime.
