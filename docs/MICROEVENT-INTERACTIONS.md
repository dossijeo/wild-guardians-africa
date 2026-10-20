# Interacciones principales del catálogo completo

Esta revisión continúa la lista original más allá de los sprites y el hold común. Los 40 eventos declaran una política compartida en `src/microevents/interactions.js`; no hay un controlador independiente por criatura ni nuevos cambios de balance.

| Mecánica | Eventos | Interacción principal |
| --- | --- | --- |
| Reunir al puntero | Semillas, luciérnagas, mariposas, hojas doradas | Contacto y seguimiento continuo de partículas próximas |
| Capturar | Escarabajo, pluma, espíritu, estrella, semilla rara, rocío, madrigueras | Toque sobre una partícula visible; la captura y su VFX funcionan aunque el dedo se levante antes del siguiente frame |
| Dispersar | Aves, langostas, insectos, esporas | Barrido con movimiento; repulsión y dispersión inmediata |
| Cepillar / desviar | Termitas, hormigas, hojas del suelo, restos, semillas espinosas, granizo, ráfaga, rama, rocas | Velocidad y proximidad del barrido; el mero contacto estacionario no cuenta como barrido |
| Frotar / deshacer | Fuego, tormenta, niebla, telaraña, rayo, calor, humo | Movimiento continuo cercano; menguan, se separan o se disuelven con el progreso |
| Girar | Remolino de polvo y vórtice | Circulación del puntero alrededor del grupo; ambos sentidos funcionan, el movimiento radial no equivale a un giro |
| Transportar al destino | Nube, grano, polen y motas arcoíris | Progreso al alcanzar el cultivo/saco/centro del grupo; soltar fuera del destino no resuelve el evento |
| Arrancar | Maleza | Capturar y separar un macizo de su posición inicial; sólo se arranca el macizo elegido |
| Mantener | Flor medicinal | Pulsación sostenida deliberada, con extracción y pulso suave |
| Guiar | Serpiente | El puntero desvía la cabeza; los segmentos siguen conservando la longitud de la cadena; se resuelve al apartarla del ancla |

La nube y el grano admiten arrastre de grupo con deformación suave y cohesión al llegar al destino. El polen apunta a una flor low-poly, corrigiendo el antiguo sprite objetivo de mariposa. Las partículas simuladas mantienen posiciones del mundo, perspectiva, profundidad y una única malla instanciada. Los estados de arrastre y feedback se reinician al reutilizar el pool. Las termitas conservan límites locales en la cara visible de la empalizada: no pueden atravesarla al ser cepilladas. Apartarlas de su zona después de un barrido real cuenta como despejarlas; el hover pasivo no lo hace.

## Accesibilidad y descubrimiento

El primer contacto sigue necesitando un sprite visible y una cesión válida de input. Mantener pulsado ofrece una alternativa a giros, barridos y persecución rápida. Se registra por separado como `accessible-hold`, sin confundirlo con el éxito de la mecánica principal ni con una acción estratégica. La flor usa hold como interacción principal.

Cuando todavía no se ha aprendido una familia de interacción en la sesión, puede aparecer un pulso de escala del 3,5% entre 2,3 y 4 segundos. Desaparece al interactuar y tras aprender esa familia; movimiento reducido lo desactiva. No se añaden pantallas de tutorial, manos, iconos del sistema ni instrucciones permanentes.

La física usa subpasos de 1/120 s y admite frames lentos hasta 250 ms sin ralentizar artificialmente el progreso. Los huecos de más de un segundo siguen cancelando el evento a través del controlador. El reloj y la aceleración nocturna del juego no cambian.

## Pruebas y diagnóstico de desarrollo

Las pruebas dirigidas distinguen giros de barridos radiales, comprueban los dos sentidos de giro, arrastres/soltadas válidos e inválidos, extracción selectiva, captura por toque, guía de cadenas y accesibilidad a 5/10/15/30/60/120 Hz. No son campañas ni pruebas de balance.

En `?qa-microevents` se añaden `QA Primary interaction` y `QA Catalogue gestures`. Son replays deterministas de desarrollo a través de la proyección, oclusión, propiedad del puntero y controlador reales, mientras se dibuja la escena normal. No mutan posiciones de partículas, progreso, economía ni resultados directamente. Durante esta verificación se desactiva explícitamente el fallback de hold (excepto la flor, cuyo gesto principal es hold). Sus informes registran si se completó por la mecánica principal; no se altera el progreso para conseguirlo. No equivalen a una prueba física de pantalla táctil ni deben presentarse como gestos manuales. La biblioteca del replay se importa sólo en desarrollo.

## Consecuencias de simulación que siguen diferidas

Se conserva la configuración económica anterior de semillas y aves. Los otros 37 tipos siguen siendo cosméticos, como permite la lista original y exige evitar nuevos cambios de balance. Las nuevas interacciones no otorgan recursos ni daño adicional.

| Propuesta original | Motivo para diferir la consecuencia |
| --- | --- |
| Luciérnagas y espíritu: poder mágico | No se eluden límites diarios de Growth/Multiply |
| Mariposas, rocío, polen, nube: crecimiento/riego local | No se introduce un modificador de cultivo ni riego nuevo para apoyar un efecto visual |
| Escarabajo, hojas, estrella, semilla rara y flor: recompensas adicionales | Ampliar recompensas o materiales alteraría el alcance económico que el usuario pidió preservar |
| Termitas, langostas y demás molestias: pérdidas/debuffs | No se añade daño o productividad negativos para justificar la interacción |
| Fuego, tormenta, granizo, ramas y rocas: daños y desastres | No se crean propagación, cambios topológicos, destrucción inesperada ni simulación climática |

Los SFX apropiados existentes y los clips aún necesarios se detallan en [MICROEVENT-FEEDBACK.md](MICROEVENT-FEEDBACK.md). Los VFX y el atlas siguen siendo originales del proyecto, sin nuevas dependencias externas ni licencias de terceros.

## Resultado de esta revisión

- 40/40 tipos resueltos por la interacción principal en la escena: 38 en cañón, niebla en manglares y termitas en empalizadas. Los replays no usaron hold auxiliar.
- Captura real de escarabajo con clic de 50 ms, sin hold.
- 99 pruebas dirigidas correctas; build normal y paquete web correctos; build Off sin código de billboards y build normal sin el módulo de replay DEV.
- Medición de CPU del controlador/preparación del lote en Intel UHD: p95 ≈0,9 ms, 246 muestras no congeladas. Medición anterior al ajuste específico de límites de termitas; excluye GPU y render de la escena base.
- Simulación de partículas final: 400.000 muestras con 30 partículas, p95 ≈0,0703 ms en Node; no equivale a FPS del juego.

Informe reproducible y hashes: [primary-interactions-review.json](qa/microevents/primary-interactions-review.json). Se conservan las pruebas fallidas iniciales y la corrección de la cara visible de las termitas; no se presentan como éxitos. Siguen pendientes la escucha artística final de SFX y las pruebas físicas en pantalla táctil, sin impedir el funcionamiento del catálogo ni inventar clips ausentes.
