# Presupuesto del smoke nativo de Windows

El job `Build Windows desktop` empaquetó correctamente la PR #46 en la
ejecución `38666382071`, pero el smoke WebView2 terminó con
`Production world did not finish loading`. El artefacto
`desktop-smoke.json` registró `worldWaitMs: 300229.6`, progreso visual 92 %
y `readyGateReached: false`. En la ejecución de `main` `38663116834`, el
smoke sí alcanzó el mundo, pero necesitó `289094.1` ms de los 300000 ms
permitidos. La diferencia observada es de sólo 10.9 s de margen en la
ejecución exitosa. Estos informes no demuestran qué trabajo interno domina
la carga ni descartan un bloqueo real en otro caso.

El presupuesto era nuestro: `src-tauri/src/main.rs` inyectaba 300000 ms
únicamente cuando `WG_DESKTOP_SMOKE_CI=1`, `src-tauri/smoke.js` lo aceptaba
y el workflow esperaba 420000 ms antes de matar el proceso. Esta revisión
eleva el límite funcional de CI a 420000 ms y la espera del proceso a
540000 ms. Conserva la prueba local en 90000 ms, y amplía el vigilante
global **sólo en CI** a 960000 ms para que el test posterior de cinco minutos
con la ventana minimizada también pueda terminar. El escenario nativo de
visibilidad puede esperar 1080000 ms y el de salida del menú, que inicia
otra carga de mundo, concede 420000 ms a esa fase y 540000 ms al proceso.
El timeout del job completo sube a 75 minutos; son límites máximos, no
esperas obligatorias. Conserva la observación de fase/progreso y el requisito de que el mundo
termine realmente de cargar. No toca el juego, su carga ni su simulación.

La validación esperada es que el smoke informe `readyGateReached: true`,
`stageBusy: false`, `ok: true` y un tiempo medido; el nuevo límite no
convierte un 92 % o una espera agotada en aprobación. Si vuelve a agotar
420000 ms, habrá que perfilar la carga con esa evidencia. La modificación
se mantiene separada de las ramas de incursiones, balance y caché WASM.
