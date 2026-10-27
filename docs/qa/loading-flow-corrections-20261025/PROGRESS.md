# Correcciones del flujo tras PR #213

Objetivo activo: corregir salida de granjeros, activar carga aprobada y revalidar el recorrido con vídeos reales antes de revisión visual.

## Causas verificadas

- `menu-landscape.js` multiplicaba la opacidad del primer plano por `1-smooth(travel/.55)`. Se elimina ese fundido; el plano mantiene su alpha original y aumenta de escala (1,035 + 3,5 × avance), saliendo naturalmente por los bordes al avanzar. Se descartan coordenadas exteriores para evitar estirar los píxeles del borde por clamp.
- `loadingDiffuseEnabled()` exigía `loadingBeam=diffuse`. La versión aprobada existía pero no era la predeterminada del paquete. Ahora se activa sin parámetros. Las comparaciones antiguas explícitas siguen disponibles.
- Se reutiliza la implementación existente de rayos difusos, isla, iluminación, sombras, cielo y transición; sin assets nuevos ni cambios de simulación.

## Verificación en curso

- Build Vite completada; 21 pruebas de carga/transición/sombras/disposición pasan.
- Paquete: 973 archivos, aproximadamente 470,76 MB; sin incremento de assets.
- Primer recorrido diurno: plantar, entrar en Manglares, guardar, menú, continuar y HUD restaurado. Sin errores ni recursos ausentes.
- Primera carga nocturna: partida guardada real a 21:54, sin alterar reloj; transición y HUD correctos.
- Primera grabación detectó estiramiento del borde del primer plano. Corregido antes de repetir vídeos; `day-flow` y `night-flow` son evidencia intermedia, no entregables finales.
- `final-day-flow` documenta fallo del guion QA: biblioteca permanecía abierta al intentar nueva partida. Se añade regreso por botón real y visita a Opciones. No se modifica el producto para sortearlo.

Completado: inspección de vídeos finales, validación Tauri y publicación de cambios revisables. No fusionar antes de la revisión visual solicitada.

Commit de implementación: `d837ce363`, publicado en `codex/global-visual-lab`. El ensayo intermedio de traslación vertical se descartó al ver que arrastraba las ramas superiores hacia el centro; la solución final usa exclusivamente acercamiento por escala.

## Recorridos finales (d837ce363)

- `release-day-flow.webm` (152,16 s): menú, cuatro demos de biblioteca, Opciones, nueva partida Manglares, plantación, carga nueva diurna, cielo/mundo, guardar, salir, continuar y HUD.
- `release-night-flow.webm` (41,96 s): menú, Continuar guardado real a 21:54, carga nueva nocturna y transición a Gran Cañón.
- Ambos informes sin errores JavaScript ni recursos ausentes. Inspeccionados contactos, acercamiento y final diurno: granjeros opacos, HUD al terminar y sin bruma persistente sobre el mundo.
- Capturas reales de navegador 1280×720, sin interpolación ni imágenes generadas. No son benchmarks: la grabación y el empaquetado nativo concurrente añaden coste. No se afirma mejora de tiempos.
- Paquete: 973 archivos, 470.759.067 bytes, 840 referencias, 17 GLB runtime. Sintaxis: 176 scripts sin fallos.
- Build Tauri/NSIS completada: 385,07 MiB. Smoke WebView2 completado: ok=true, mundo listo y stageBusy=false en 17,69 s (prueba funcional, no benchmark comparativo).
- PR #214 en borrador, sin fusionar.

Reproducción diurna: ejecutar `tools/experiments/check-production-package-ui.mjs` sobre dist, con WG_PACKAGE_UI_START/VIDEO/PLANT/LIFECYCLE/LIBRARY/OPTIONS=1, WG_PACKAGE_UI_BIOME=manglares y WG_PACKAGE_UI_REPORT=<salida>. Noche en proceso separado: VIDEO=1, FIXTURE=.codex-qa/desktop-visibility-current.json y REPORT=<salida>, sin START/LIBRARY/OPTIONS. Fixture de partida genuina, sin overrides de reloj.

Limitaciones: no se repitió la matriz completa de seis biomas ni benchmarks; el cambio solo afecta al menú y a la presentación de carga. La validación nocturna visual se realiza en Chrome; Tauri usa smoke funcional. Las evidencias intermedias se conservan localmente para estudiar los descartes.
