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

**Límites:** Chrome headless prueba una pestaña web real, pero no un teléfono físico ni todos los navegadores móviles. Los informes iniciales tienen la interferencia de Vite descrita arriba; la repetición aislada resuelve ese problema para Chrome. QA-014 sigue parcial hasta cubrir la aceptación física en teléfono.
