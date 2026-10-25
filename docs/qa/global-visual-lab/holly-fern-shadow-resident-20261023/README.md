# Prototipo QA: poblacion de sombra independiente para helechos

Se conserva la cobertura visible. Un proxy entra solamente en la pasada solar y usa una poblacion radial de tiles residentes, hasta distancia visible+12m, centro actualizado en una rejilla8m. Reutiliza las mascaras/render heights del terreno: ninguna consulta de navegacion ni cambio de simulacion. La pose de profundidad no usa LOD/fade de camara y su viento se actualiza a10Hz. Capacidad65536; capturas18-20mil instancias, sin overflow. Buffers separados, no objetos por helecho.

Seis capturas reales dia/noche, mismas tres vistas/semilla712/calidad media. Comparativas muestran que mantiene la masa/color; sombras pueden diferir porque incluye casters fuera de vista. No es igualdad pixel a pixel ni equivalencia artistica alcanzada.

La prueba inicial rechazo callbacks por dos instancias distintas de Three en el entorno QA; corregido copiando los callbacks vacios del mesh nativo. Se conserva initial-untracked-captures.json para identificar ese fallo. Capturas definitivas: cero untracked, reutilizacion de cache.

Recorrido movil de8m: 62 dibujos y238 aciertos de cache en300 renders (150 pasos manuales intercalados con el bucle real), cero errores GL. Esto demuestra que la camara deja de forzar la sombra cada frame; NO demuestra ahorro GPU. La pasada ahora dibuja mas casters que la poblacion visible. Debe medirse A/B/A/B antes de recomendar.

Limitaciones de prototipo: sombra con geometria completa sin fade distante puede quedar donde la hoja visible ya desaparece; margen12m no es prueba conservadora para todos los angulos solares/relieves; cambios de centro pueden producir saltos. Falta video nocturno y cruce de bordes, streaming/cambios de mascara en el mismo chunk, cambio de calidad y restauracion de contexto. El hook se libera al disponer el experimento, pero no implementa reconexion tras perdida de contexto. No integrar todavia. No reducir densidad ni eliminar la variante artistica como respuesta a estas limitaciones.

Reproduccion con Vite5190 y WG_CARD_TREATMENTS=cards:
- node tools/experiments/capture-holly-fern-shadow-resident-20261023.mjs
- node tools/experiments/probe-holly-fern-shadow-resident-motion-20261023.mjs
