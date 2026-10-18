# Wild Engine como navegador oficial: validación experimental

Esta rama conecta la aplicación interactiva a la misma sesión C++/WASM que
genera los chunks, mantiene los obstáculos y resuelve las rutas. El arranque
ordinario ya no depende de `qa-spatial-world` ni de `qa-native-intents`.
El adaptador `Navigation` de JavaScript deja de instanciarse en la aplicación;
permanece en pruebas y herramientas antiguas hasta que sus consumidores se
migren o retiren con cobertura equivalente.

## Compatibilidad de partidas

Las partidas nuevas llevan `wildEngineWorldVersion: 1`. Un guardado anterior
se rechaza con un mensaje explícito porque el generador espacial cambió y
sus posiciones persistidas podrían quedar dentro de agua, roca o muralla en
el nuevo mundo. La partida nativa guardada durante esta prueba se restauró en
el navegador y volvió al HUD del día 1 sin error.

## Pruebas actuales

- `npm run build`: correcto; WASM incluido en el paquete.
- `npm run test:playable`: 210/210.
- Native opening, site, and campaign-terminal tests: 19/19; opening tests
  exercise the six biomes and a worker-reachable crop.
- Navegador local, Sabana/712: partida nueva y restauración del guardado llegan
  al HUD sin errores de consola. Gran Cañón/712 también arranca y llega al HUD.
- Falta prueba interactiva equivalente de los otros cinco biomas y de acciones
  completas con trabajadores, incursiones y construcción antes de fusionar.

## Rendimiento de magias sobre cultivos

`node tools/experiments/benchmark-wild-engine-crop-spells.mjs 712 sabana informe.json`
genera una carga sintética, con 50 ticks de 0,1 s por brazo y orden
control/crecimiento/multiplicar/multiplicar/crecimiento/control. Es una medida
de CPU de `Game.cast` y `Game.tick`, sin Three.js ni VFX. Una medición inicial
en este host dio, para 1.500 cultivos:

| Acción | Lanzamiento (ms) | 50 ticks (ms) |
| --- | ---: | ---: |
| Ninguna | ~0 | 38,25–42,42 |
| Crecimiento | 0,49–0,68 | 48,33–58,07 |
| Multiplicar | 0,29–0,32 | 41,53–42,73 |

La primera pasada sugiere un coste adicional de crecimiento, pero la segunda
es dispersa y ninguna representa por sí sola una ralentización visual grande.
**Pendiente antes de concluir la
investigación:** medir en el juego interactivo latencia del clic, tiempo de
`Game.tick`, CPU de sincronización/renderizado, tiempo de fotograma GPU y vida
de los VFX al lanzar crecimiento y multiplicar con fincas pequeñas, medianas
y grandes. Comprobar también que los efectos terminados desaparecen. No
atribuir a navegación un coste de VFX sin separar ambas mediciones.
El [registro JSON](crop-spells-sabana712.json) conserva una segunda pasada
después de actualizar la rama con `main`; la dispersión entre brazos es grande
por JIT/GC y confirma que estas cifras son exploratorias, no un criterio de
aceptación ni una estimación de p95 interactivo.

## Retirada de código anterior

La ruta de arranque experimental limitada a Sabana se ha sustituido por un
arranque Wild Engine para los seis biomas y guardados nativos. La aplicación
ya no prepara rutas de contratación con el navegador JavaScript. La limpieza
de módulos de navegación antiguos compartidos por QA, workers de pruebas y
otras herramientas requiere inventario de importaciones y regresiones antes
de eliminarlos; no se consideran retirados en esta rama todavía.
