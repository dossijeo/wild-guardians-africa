# Continuidad de textura al pie de pared del Gran Cañón

Ensayo QA sobre global-lighting, fuente d809dcfd3. Referencia artística original revisada: `ART-REFERENCES.md`, Gran Cañón. No se modifican modelos, geometría, siluetas, navegación ni simulación.

## Hipótesis y cambio

La roca Cliff Side integrada se desvanece por altura mediante `smoothstep(1.4,4.,h)`. Esto produce una franja lisa al pie. La variante elimina ese factor únicamente de `rockWall`, manteniendo `1.-canyonFlat`, el material del suelo y el resto de iluminación. Reutiliza el mapa CC0 ya integrado; no incorpora assets nuevos.

## Resultado y decisión

La roca llega hasta la base y se elimina parte de la franja lisa. No aporta un salto de volumen: persisten la franja clara de contacto, repetición y aspecto de pared pintada. La vista normal tampoco acerca el conjunto de manera suficiente al mockup. **No integrar; conservar únicamente evidencia y herramienta QA.** No continuar con un barrido de intensidades de esta misma modificación.

[Antes oblicuo](gran-canon-base-oblique-day.webp) / [después](gran-canon-candidate-oblique-day.webp), [noche](gran-canon-candidate-oblique-night.webp), [normal corregida](normal/gran-canon-candidate-normal-day.webp).

## Validación y coste

16 capturas reales de campaña, cuatro vistas, día/noche, semilla712, calidad media, 1280×720. Ocho pares con misma cámara, objetivo, hora, entidades, draw calls y triángulos informados por el renderer. Sin errores de página, consola o HTTP registrados; glError=0. WebP verificado sin pérdida contra PNG. [Comparación](comparison.json), [tres vistas](captures.json), [normal](normal/captures.json).

No se crean texturas, geometría o draws en el parche. Se ejecuta la lectura de textura existente en más fragmentos de la base: no es gratuito por definición. Los contadores del harness son `renderer.info` y no un perfil GPU de todas las pasadas. No se mide tiempo CPU/GPU adicional: la mejora artística es insuficiente y las últimas rondas documentaron deriva incluso bajo control nulo. No se aprueba un presupuesto ni se extrapolan costes anteriores.

El primer encuadre normal (+32,+24,+28) atravesaba una pared y mostraba recortes; se invalidó y reemplazó por (+12,+18,+18), dentro del corredor. No se atribuye aquel recorte al shader. Las capturas publicadas de normal corresponden al encuadre corregido.

## Límites y siguiente dirección

Parche de materiales residentes, sin binding de nuevos chunks ni horizonte. No es una implementación candidata para streaming. No cubre otras semillas o calidades. No se afirma continuidad de todos los límites ni calidad global alcanzada. La diferencia respecto a la referencia reside también en las masas de vegetación, material de las orillas, contraste de planos y estructura visible del relieve; añadir detalle de textura en una franja no lo sustituye.

Reproducir: `node tools/experiments/capture-canyon-wall-foot.mjs` y `node tools/experiments/capture-canyon-wall-foot-normal.mjs`, Vite del worktree en5190. PNG convertidos a WebP sin pérdida para publicación. Main intacto y atlas del taller en pausa.
