# Integración de los actos narrativos

Fuente aprobada: rama `feature/wild-guardians-cinematics-lab`, commit `395c3aa0be75e71df3af30d4bb2de907c632a379`. `tools/build_campaign_cinematics.mjs` extrae del manifiesto sus 50 escenas, 105 capas WebP y 100 voces Opus mono, sin incluir los originales planos del laboratorio. El paquete runtime ocupa 34.1 MB. No se han modificado las ilustraciones, el texto, la locución ni los parámetros de parallax aprobados.

Cada décima noche superada dispara un acto. Las noches 10–90 quedan detenidas en la pausa de contratación; la 100, en el resultado de victoria. El reproductor ocupa la pantalla antes de que se monte el diálogo correspondiente. La derrota no reproduce ningún acto. El progreso `cinematicSeenAct` se guarda con la partida y evita repetir un acto terminado o saltado. Las partidas anteriores a esta función se incorporan a su capítulo actual sin reproducir retrospectivamente todos los actos. Si se interrumpe el juego antes de terminar el acto, el guardado conserva el último acto completado y se reproduce de nuevo al continuar.

El reproductor usa `HTMLAudioElement` con Opus y `preload=metadata`; cada voz se lee como medio en streaming, sin decodificar las cien pistas en RAM. La primera escena se decodifica durante el fundido de entrada. Mientras se reproduce una escena se decodifica la siguiente; solo se mantienen la escena actual y la siguiente, más la anterior durante su breve transición. La música del juego se silencia durante el acto y recupera el volumen configurado al finalizar. La entrada y la salida pasan por negro. `Escape` y el botón Saltar terminan el acto completo.

Validación local, 2026-10-12:

- `node --test tests/campaign-cinematics.test.mjs`: 4/4. Disparadores 10–100, derrota y pospartida, guardado/carga, compatibilidad con partidas antiguas y 205 recursos referenciados.
- `npm run test:playable`: 185/185. `npm run build`, `npm run test:web-package`, `npm run verify:assets`, `npm run verify:web-assets`, `npm run verify:audio-runtime`, `npm run verify:browser-syntax`, `npm run verify:plan` y `npm run verify:balance`: correctos.
- Navegador integrado: actos I y X en español e inglés. Capturas inspeccionadas en 1280×720, 844×390, 390×844 y 360×640. Las capas mantienen proporción 16:9 y no se deforman en vertical. El botón de salto no interseca el rectángulo de subtítulos en ninguno de esos tamaños. La primera imagen estaba decodificada antes de mostrarla; salto y limpieza del diálogo confirmados, sin errores de consola.
- La suite histórica `npm test` contiene 139 fallos de balance ajenos a esta integración. Se reprodujo en `main` el caso `Sabana/Mapungubwe/712/olderFemale: sunflower`, que termina en derrota donde el test histórico espera victoria. El gate vigente en CI es `test:playable` y pasa.

Límite de QA: la reproducción de los diez actos completos dentro de una campaña nativa de 100 noches no se ha ejecutado; el disparo de cada hito y el ciclo del reproductor se validaron por separado. La aceptación visual del laboratorio previo procede del usuario.
