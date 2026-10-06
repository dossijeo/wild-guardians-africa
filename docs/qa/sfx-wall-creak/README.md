# SFX 044: crujido al entrar en daño crítico

El detalle sonoro `wall_structural_creak` utiliza el cruce de umbral crítico ya capturado en StructureHit: muralla, daño efectivo, HP anterior por encima del umbral y HP final en/bajo él. No añade daño, fases de ataque ni mensajes. Tampoco suena por un impacto que permanezca por encima/bajo el umbral o no cambie HP.

El evento captura X/Z del objetivo. El crujido utiliza esa posición y la distancia al oyente; bus world, familia structure-detail y emisor de la muralla, separado del animal. Eventos antiguos sin coordenadas pueden usar la presentación/entidad disponible. Caduca a los 0,5 s y se descarta al salir, ocultar/abrir menú o perder contexto. El historial recordado no vuelve a sonar. Sigue siendo un disparo por cruce, no un bucle ni una alerta UI adicional.

## Evidencia

- 82 pruebas dirigidas correctas: 50 combinaciones de cinco materiales, puerta/no puerta y cinco especies con impactos reales del motor sobre una frontera de HP preparada explícitamente. El cruce selecciona 044 una vez; el siguiente golpe no lo repite. Se contemplan golpes que agotan HP, centros, legacy, ausencia de daño y ataques que no cruzan umbral.
- Despacho de audio: deduplicación, silencio del historial, posición del impacto incluso tras retirar el objetivo, atenuación exacta, dominio sin modificar, caducidad y descarte por pausa/escena. 436 pruebas ampliadas de audio/tutorial correctas.
- Navegador integrado: diez casos (cinco materiales, con/sin puerta) mediante incursión lógica real de facóquero. HP/fase de ataque preparados; un crujido por cruce y cero replay. AudioContext/descodificación reales, Opus mediante alias existente, fuentes liberadas, contextos cerrados y cero errores globales. Datos native.json y captura native.jpg.
- Catálogo: 85 asignados/41 pendientes y bytes originales de los 126 correctos. Esto no acredita escucha ni integración de los restantes.
- Build y paquete: 587 archivos, 388.202.961 bytes, 859 enlaces relativos y veinte GLB. Sin audio nuevo/duplicado.

## Arreglo de CI anterior

Validate game 37409146771 para 596805a falló en verify_sfx_runtime porque el catálogo de rutas original había cambiado al conectar 109 y su derivado Opus conservaba hashes/rutas antiguos. Log de fallo adjunto. Se regeneran los metadatos con `node tools/prepare_sfx_runtime.mjs`, incluyendo 109 y 044, sin recomprimir audio. `npm run verify:audio-runtime` vuelve a pasar: 21 músicas, 550 ventanas, 126 SFX y tres metadatos, hashes/exportaciones correctos. La CI nueva necesita su propio resultado; esta prueba local no lo sustituye.

## Reproducción y límites

`node --test tests/structure-detail-audio.test.js`; abrir tests/browser/structure-detail-audio.html y pulsar Probar crujidos; `node tools/audit_sfx_catalog.mjs --check`; `npm run verify:audio-runtime`; build y test:web-package.

Pruebas de dominio/audio con navegación plana y ataque/HP preparados: no certifican aproximación sobre terreno nativo, VFX/render 3D, móvil físico ni cien noches. La salida del navegador está silenciada: aceptación técnica de las fuentes, no escucha. No se probó reparación física seguida de otro cruce, aunque el selector no conserva una marca permanente de muralla.
