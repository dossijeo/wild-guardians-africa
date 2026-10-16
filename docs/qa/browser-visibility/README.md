# QA-014: pestaña web oculta y restaurada

Se ejecutó Wild Guardians en Chrome 155 mediante Vite, con dos pestañas reales controladas por Chrome DevTools Protocol. `Target.activateTarget` cambió la pestaña activa y el navegador informó `document.hidden=true` y `visibilityState=hidden` para la partida. La lectura de estado está disponible únicamente en desarrollo con `?qa-visibility`; el build de producción elimina ese punto de lectura.

El script reproducible es [`tools/experiments/qa-browser-visibility.py`](../../../tools/experiments/qa-browser-visibility.py). Utiliza `websocket-client` de Python y un Chrome arrancado con un perfil de QA distinto del perfil normal, `--headless=new`, `--remote-debugging-port=9223` y `--remote-allow-origins=*`. Con Vite en `http://127.0.0.1:5179`, ejecutar:

```text
python tools/experiments/qa-browser-visibility.py --seconds 300 --out docs/qa/browser-visibility/sabana-712-chrome-300s.json
python tools/experiments/qa-browser-visibility.py --fixture docs/qa/recalled-hiring/confirmed-snapshot.json --seconds 300 --out docs/qa/browser-visibility/recalled-hiring-chrome-300s.json
```

El primer registro, [`sabana-712-chrome-300s.json`](sabana-712-chrome-300s.json), prueba una partida nueva de Sabana/712 durante **300,008 s** ocultos. El estado completo, excluida únicamente la causa de pausa `hidden`, conserva el mismo SHA-256 (`15185560f750221d298beb44dcd3dc813f747f24439e5b3e3ef428fbcd4ff9e5`) al comienzo y al final. `elapsed` permanece en 3,4415 s; 2,5 s después de volver marca 5,9737 s, sin sumar los cinco minutos ocultos. La causa de pausa se añadió al ocultar y se retiró al volver.

La partida guardada [`confirmed-snapshot.json`](../recalled-hiring/confirmed-snapshot.json) contiene un cultivo vivo y un trabajador en camino a una tarea. La comprobación corta [`recalled-hiring-chrome-2s-details.json`](recalled-hiring-chrome-2s-details.json) muestra que mientras la pestaña estuvo oculta no cambiaron crecimiento, agua, daño del cultivo, posición ni tarea del trabajador. Tras restaurar, el trabajador volvió a avanzar. En esa ejecución no se registraron excepciones JavaScript de página.

Las nueve pruebas dirigidas de reloj, pausa, restauración nativa y delta de frame pasaron. `npm run build` pasó, y se comprobó que `wildGuardiansVisibilityQa` no aparece en `dist/assets`.

**Límites:** Chrome headless prueba una pestaña web real, pero no un teléfono físico ni todos los navegadores móviles. La partida nueva no contiene cultivos ni trabajadores; la partida guardada añade ese caso. La prueba de cinco minutos de la partida guardada y la aceptación física en teléfono se registran por separado. QA-014 sigue parcial hasta cubrir esa aceptación.
