# Sintaxis de páginas QA

La fixture de SFX 043/046 no llegaba a instalar el handler: su declaración del kernel estaba incompleta y Vite devolvía HTTP 500 al módulo inline. Se cierra el objeto y se añade su función radiusAt, exigida por el emisor original. El mismo endpoint devuelve ahora HTTP 200 y el script pasa la comprobación de sintaxis.

`npm run verify:browser-syntax` analiza los scripts JavaScript inline de las páginas versionadas de `tests/browser`; no ejecuta el código ni resuelve imports. Omite scripts de datos, GLSL y referencias externas src. Se añade al workflow Validate Game antes de npm test.

Barrido local: 134 páginas y 133 scripts, cero fallos. El test de regresión comprueba que un módulo mal formado sea rechazado, que JSON/GLSL no se interpreten como JS y que un script válido con import inexistente y throw no llegue a ejecutarse. Los informes y hashes se conservan aquí. No prueba comportamiento de navegador, imports externos, percepción visual ni audio hasta ended.

La ejecución [37570888135](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37570888135) de 016872d terminó con 2707/2708 tests: el único fallo fue QA-152, que todavía esperaba reserved para los nuevos sonidos conectados. El contrato exacto se actualizó en bbe0a4b y pasó localmente en el conjunto de 49 tests. El log fallido se conserva sin presentarlo como CI verde; bc2f0aa necesita su propio resultado completo.

La pestaña de audio 642 se conserva. Tras corregir la sintaxis se intentó recargar explícitamente esa fixture, pero el acceso CDP agotó su plazo y no produjo un informe de reproducción; no se reinicia la prueba de voces 638 ni se marca audio nativo como aprobado.
