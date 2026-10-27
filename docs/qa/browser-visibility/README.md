# QA-014: pestaña web oculta y restaurada

Se ejecutó Wild Guardians en Chrome 155 mediante Vite, con dos pestañas reales controladas por Chrome DevTools Protocol. `Target.activateTarget` cambió la pestaña activa y el navegador informó `document.hidden=true` y `visibilityState=hidden` para la partida. La lectura de estado está disponible únicamente en desarrollo con `?qa-visibility`; el build de producción elimina ese punto de lectura.

**Corrección de aislamiento:** en las primeras ejecuciones, el perfil temporal de Chrome estaba dentro del proyecto. Vite observó archivos de ese perfil y registró recargas. Se conservan los informes iniciales como evidencia histórica, pero no se usan por sí solos para cerrar la aceptación. Las repeticiones usan un perfil fuera del repositorio y exigen que durante el ocultamiento no haya eventos `Page.frameNavigated` ni `Runtime.executionContextsCleared`.

El script reproducible es [`tools/experiments/qa-browser-visibility.py`](../../../tools/experiments/qa-browser-visibility.py). Utiliza `websocket-client` de Python y un Chrome arrancado con un perfil de QA **fuera del árbol servido por Vite**, distinto del perfil normal, `--headless=new`, `--remote-debugging-port=9225` y `--remote-allow-origins=*`. Ejecutar estos comandos en terminales separadas y en este orden:

```text
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --remote-debugging-port=9225 --remote-allow-origins=* --user-data-dir="$env:TEMP\wg-chrome-qa-visibility-9225" --no-first-run --no-default-browser-check about:blank
npm run dev -- --port 5179 --strictPort
python tools/experiments/qa-browser-visibility.py --cdp http://127.0.0.1:9225 --fixture docs/qa/recalled-hiring/confirmed-snapshot.json --seconds 300 --out docs/qa/browser-visibility/recalled-hiring-chrome-isolated-300s.json
```

El primer registro, [`sabana-712-chrome-300s.json`](sabana-712-chrome-300s.json), prueba una partida nueva de Sabana/712 durante **300,008 s** ocultos. El estado completo, excluida únicamente la causa de pausa `hidden`, conserva el mismo SHA-256 (`15185560f750221d298beb44dcd3dc813f747f24439e5b3e3ef428fbcd4ff9e5`) al comienzo y al final. `elapsed` permanece en 3,4415 s; 2,5 s después de volver marca 5,9737 s, sin sumar los cinco minutos ocultos. La causa de pausa se añadió al ocultar y se retiró al volver.

La partida guardada [`confirmed-snapshot.json`](../recalled-hiring/confirmed-snapshot.json) contiene un cultivo vivo y un trabajador en camino a una tarea. La comprobación corta [`recalled-hiring-chrome-2s-details.json`](recalled-hiring-chrome-2s-details.json) muestra que mientras la pestaña estuvo oculta no cambiaron crecimiento, agua, daño del cultivo, posición ni tarea del trabajador. Tras restaurar, el trabajador volvió a avanzar. En esa ejecución no se registraron excepciones JavaScript de página.

La comprobación larga del mismo guardado, [`recalled-hiring-chrome-300s.json`](recalled-hiring-chrome-300s.json), registra **300,007 s** ocultos. Su estado completo conservó el SHA-256 `0a1b1a72359317a3f61ee41c3ae1cb0c8ba342e2b3a30ad56231ece3a636e2ec` de principio a fin: `elapsed=603,154`, saldo 45, un cultivo vivo, un trabajador y diez eventos. A los 2,5 s de restaurar, `elapsed=605,665`; los cinco minutos ocultos no se sumaron. El informe registra SHA-256 del código de la aplicación y del script de QA utilizado.

Las nueve pruebas dirigidas de reloj, pausa, restauración nativa y delta de frame pasaron. `npm run build` pasó, y se comprobó que `wildGuardiansVisibilityQa` no aparece en `dist/assets`.

La repetición corta con perfil aislado [`recalled-hiring-chrome-isolated-2s.json`](recalled-hiring-chrome-isolated-2s.json) pasó los siete controles, incluida la ausencia de navegación durante el ocultamiento.

La repetición larga con perfil aislado, [`recalled-hiring-chrome-isolated-300s.json`](recalled-hiring-chrome-isolated-300s.json), pasó también los siete controles. Registró **300,008 s** realmente ocultos, sin eventos de navegación ni excepciones JavaScript. El estado completo mantuvo el SHA-256 `9f20daffdebefa84e323d49bde5659c220a56b094581d132e295ffffcf8a007a` y `elapsed=603,1591` de principio a fin; permanecieron iguales el saldo de 45, el crecimiento/agua/daño del cultivo y la posición/tarea del trabajador. A los 2,5 s visibles tras restaurar, `elapsed=605,6786` y el trabajador había reanudado su desplazamiento. No se acumularon los cinco minutos ocultos.

## Repetición con Wild Engine actual

El guardado antiguo `confirmed-snapshot.json` ya no carga: precede a la versión de mundo de Wild Engine. [El rechazo actual](legacy-fixture-rejection-current.json) queda registrado para no confundir esa muestra histórica con la validación vigente. Para repetir el caso con un cultivo y una trabajadora activos se genera [`native-farm-current-fixture.json`](native-farm-current-fixture.json) con [`prepare-visibility-fixture.mjs`](../../../tools/experiments/prepare-visibility-fixture.mjs). El generador utiliza el emplazamiento nativo y comandos legales: centro, un mijo y contratación pagada; después deja a la trabajadora caminando hacia la tarea. Omite el tutorial exclusivamente para este ensayo. El archivo archivado tiene SHA-256 `ab927f29d137df2b5a67a848ff7902ad4cf8c808a036dcf17706b86d7ffbc0`.

Con Vite en el puerto 5187 y Chrome headless aislado en CDP 9231, la repetición es:

```text
node tools/experiments/prepare-visibility-fixture.mjs test-results/browser-visibility-current-fixture.json
python tools/experiments/qa-browser-visibility.py --cdp http://127.0.0.1:9231 --game "http://127.0.0.1:5187/?qa-seed=712&qa-visibility" --fixture test-results/browser-visibility-current-fixture.json --seconds 300 --out docs/qa/browser-visibility/native-farm-current-300s.json
```

El [informe](native-farm-current-300s.json) corresponde a `main` en `c98c8a8d9` y Chrome 155. Observó **300,009 s** ocultos y pasó los siete controles. El hash completo sin la causa de pausa `hidden` se mantuvo en `c6b6cdf1cb566563021ade7a5e78e97cadf644b720abfc0ca34af2fff4bf84f9`; también permanecieron `elapsed=6,361`, 665 monedas, crecimiento/agua/daño del cultivo y la posición/tarea de la trabajadora. Tras restaurar, `elapsed=8,8975` y la trabajadora avanzó. No hubo navegación ni excepciones de página.

**Alcance:** el escenario escrito de QA-014 queda acreditado en una pestaña real de Chrome oculta durante cinco minutos, sin avance offline al volver. Chrome headless no acredita teléfonos físicos ni todos los navegadores móviles; esa comprobación de compatibilidad la realiza el usuario por separado y no bloquea la implementación. Los informes iniciales tienen la interferencia de Vite descrita arriba; la repetición aislada la resuelve para Chrome.
