# Asociación inicial de centros por camino válido

Implementación `611a77c`, 3 de octubre de 2026. Completa el ajuste pendiente identificado en la auditoría territorial de `4890c6d`, conforme a D127 y la sección de poblados del Plan Maestro.

## Comportamiento

Construir un centro elegía el poblado más cercano en línea recta, incluso si una barrera impedía llegar a él o existía un camino más corto hacia otro. Ahora se comprueba la huella nativa correspondiente a la cultura de cada poblado, sus colisiones y los cultivos existentes. Entre las propuestas edificables con camino válido de ida y vuelta, se elige la menor distancia completa desde el punto de servicio; los empates usan el ID persistente.

La construcción conserva la cultura, huella y supresiones de vegetación de la propuesta seleccionada. Si ninguna permite llegar a un poblado, se rechaza antes de cobrar, consumir IDs o emitir eventos. El error se traduce al inglés y al español.

`previewCenter` es una comprobación lógica sin mutar la partida; no añade una pantalla ni un fantasma visual nuevo. `Navigation.forBuildingPlacement` realiza la consulta con la huella futura y las supresiones previstas, en un contexto separado con cachés propias. La consulta no invalida las rutas activas ni modifica sus obstáculos. Las geometrías y los recursos del terreno pueden seguir compartiendo su caché normal de lectura.

## Evidencias

[center-logistics.test.js](../tests/center-logistics.test.js) añade siete ensayos:

- Poblado cercano con rodeo largo o sin ruta: se elige el otro poblado accesible y se cobran 800.
- Ningún destino con ruta: el estado serializado completo queda idéntico.
- Cinco culturas: propuesta y construcción coinciden en cultura, huella girada, vegetación suprimida y guardado.
- Huella no edificable o solapamiento con cultivos: no se selecciona ni se cobra.
- Navigation real sobre terreno plano, con barrera física: se elige el poblado accesible; las referencias y tamaños de todas las cachés, los obstáculos, supresiones y versión del navegador vivo permanecen intactos tras consultar.
- Navigation real y la barrera conservada en el estado: contratar un trabajador, atender un mijo y regresar al poblado elegido; se comprueba cada segmento recorrido, primer cuidado real, cero cajas sin orden de cosecha y saldo 9.095 = 10.000 iniciales − 800 − 5 − 100.
- Traducción exacta del rechazo en inglés y español.

Los terrenos planos y el presupuesto inicial son condiciones del ensayo. No acreditan rentabilidad ni la aceptación visual de todas las combinaciones de bioma y cultura. El bloqueo aislado inicial se conserva en [before.log](qa/center-logistics/before.log): los dos primeros ensayos acreditan el defecto anterior; otros tres fallaban porque las APIs nuevas aún no existían.

Pruebas dirigidas finales de `2222037`: **74/74**, sin fallos ni omitidas, 3,50 segundos: [directed.log](qa/center-logistics/directed.log). Incluyen los ensayos existentes de GLB nativos, juego, plantilla, idiomas y navegación de bestias; no son 74 ensayos nuevos.

La primera suite completa de `611a77c` tuvo 690/695 correctos: [full-before.log](qa/center-logistics/full-before.log), [ci-before.log](qa/center-logistics/ci-before.log). Las cinco pruebas fallidas registraban todos los radios de navegación desde antes de preparar el centro; las nuevas consultas de trabajadores de 0,28 m se mezclaban con los radios de las bestias. `2222037` mueve el inicio de observación después de preparar la finca. Se mantiene la aserción de que todas las consultas de la incursión usen exactamente el radio nativo de la bestia; no se elimina ni se filtra esa cobertura.

Suite completa local final de `2222037`: **695/695**, sin fallos ni omitidas, 290,48 segundos: [full.log](qa/center-logistics/full.log). La [CI 37092966029](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37092966029) termina correctamente para el mismo commit con las pruebas completas, verificaciones de recursos/reglas, build y empaquetado web: [ci.json](qa/center-logistics/ci.json), [ci-results.txt](qa/center-logistics/ci-results.txt).

La verificación del plan conserva sus 123.048 aserciones y 5.000 escenarios originales de reparto correctos. El registro mantiene sus 159 IDs únicos y el hash del plan autoritativo sin cambios; todas sus rutas de evidencia existen. La aceptación global del Plan Maestro sigue abierta.
