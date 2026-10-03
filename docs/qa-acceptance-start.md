# Auditoría incremental del arranque y feedback

Implementación: `14c61f4`, 3 de octubre de 2026. El registro completo de los 159 casos está en [acceptance-progress.json](qa/acceptance-progress.json). Se conserva intacto el catálogo original del Plan Maestro. Este primer bloque acredita dos casos, deja seis parcialmente comprobados y 151 pendientes de auditoría individual; no acredita la implementación completa ni toda la matriz móvil.

## Fallo encontrado y corregido

La instrucción de colocación `.hint` y el aviso `.error-banner` se situaban en el pie del mundo, dentro de la franja reservada al Espíritu. Aunque el DOM contenía el mensaje de solapamiento, la captura no permitía leerlo. Se utiliza ahora `#placementBanner` del HUD original para la herramienta activa y el error, con Cancelar; los errores de paneles o modales se insertan dentro de su contenido. La cancelación elimina la herramienta y su preview de muralla. No cambia reglas, navegación, supresiones ni cobros.

Antes: [invalid-before.png](qa/acceptance-start/invalid-before.png). Después: [invalid-after.png](qa/acceptance-start/invalid-after.png), [inglés](qa/acceptance-start/invalid-after-en.png).

## Comprobación real del flujo

Se abrió un servidor separado en `127.0.0.1:5176`, con almacenamiento independiente del juego del usuario en 5173. Desde el menú original se eligió Juego nuevo → Sabana → Mapungubwe. Se reconocieron las dos primeras lecturas y se llegó a la instrucción del centro, con 1.000 monedas y contratación deshabilitada.

Colocar sobre una casa del poblado fue rechazado por solapamiento; saldo 1.000. Cancelar retiró el banner y conservó el saldo. La colocación válida cobró 800 y mostró la lectura de cultivos: saldo 200. Sembrar mijo cobró 5 y habilitó la lectura de contratación: saldo 195. Contratar un hombre mayor cobró 100 y mostró la siguiente lectura: saldo 95. Evidencias: [primer centro](qa/acceptance-start/first-center-en.png), [primera contratación](qa/acceptance-start/first-hire-en.png). Esto acredita QA-003 y QA-005 en el flujo integrado, junto a sus pruebas dirigidas.

El primer intento de doble clic mediante un locator acabó al desmontarse el iframe. Se comprobó un mundo y una ranura, pero no se acredita la entrega del segundo clic. QA-002 queda parcial. El código del selector cancela el evento de arranque antes de programar los temporizadores de demostración; falta una comprobación de doble activación entregada efectivamente.

## Tamaños e idiomas

El banner de colocación y su error se comprobaron a 1280 × 720 en español e inglés. En inglés se comprobaron 390 × 844 y 844 × 390, incluyendo texto partido en varias líneas y Cancelar. No se solapan con la franja del Espíritu. Evidencias: [vertical](qa/acceptance-start/invalid-portrait-en.png), [horizontal](qa/acceptance-start/invalid-landscape-en.png). El override de viewport se restauró al terminar. El texto dinámico de siembra también se tradujo a «Plant Millet · 5 coins» y permaneció traducido durante las actualizaciones del HUD.

QA-006 sigue parcial: falta comprobar los precios, retratos y confirmaciones de contratación en estos tamaños. QA-008 sigue parcial: se verificaron selección de terreno inválida y solapamiento, pero no los errores de fondos insuficientes ni las rutas de feedback dentro de paneles/modales. [blocked-ground-en.png](qa/acceptance-start/blocked-ground-en.png) es un rechazo por árbol/roca, **no** una prueba de fondos insuficientes.

## Validación

- 46/46 pruebas de juego, tutorial e idiomas: [tests.log](qa/acceptance-start/tests.log), 7,08 s. Cubren, entre otros, el cobro único, colocación inválida sin mutación, 30 combinaciones canónicas y pausas apiladas. No sustituyen sus comprobaciones integradas pendientes.
- Build correcto: [build.log](qa/acceptance-start/build.log), 5,33 s. Persiste el aviso de bundle JavaScript superior a 500 kB.
- Paquete web correcto: [package.log](qa/acceptance-start/package.log), 554 archivos, 379.672.787 bytes, 794 enlaces relativos y 20 GLB de runtime, sin duplicados originales.

La suite completa previa de 651 pruebas pertenece al commit `9083014`; no se presenta como una nueva ejecución de este cambio. Este bloque no contiene una nueva medición de GPU ni modifica las conclusiones de las optimizaciones anteriores.
