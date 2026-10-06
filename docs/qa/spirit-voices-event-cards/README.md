# Tarjetas HUD y voces del Espíritu

Implementación sobre main `bccdd74` (incluye `5e15c67` y `6821fd1`). Sin publicar itch ni modificar reglas de simulación.

## Fuentes y correspondencia

- `content/manifests/spirit-voices.json`: SHA-256 del HTML V9 adjunto, texto exacto, idioma, ruta, tamaño y hash de cada clip. 54 archivos / 27 por idioma / 7.550.113 bytes. Cabeceras `OpusHead`: dos canales, 48.000 Hz. Los bytes se extraen del data URI sin transcodificar, normalizar o cambiar pitch; conserva la receta Unity Stereo original.
- `tools/extract_spirit_voices.py <ruta-al-HTML>` reproduce la extracción sin imprimir base64. Todos los textos del catálogo ES/EN v2 encuentran su clip exacto; también las variantes de defensa, entrega y resultados. Los dos títulos finales están disponibles como clips para presentaciones que los usen.
- Tarjetas recuperadas del markup CSS y `addNotice` en `references/extracted/Wild_Guardians_HUD_Lab_Contratacion_Diaria`. Iconos `event0/1/2/5/8/11` corresponden a acontecimientos existentes; no se generan eventos nuevos ni se cambia su historial guardado.

## Comportamiento

Una sola voz por presentación, mediante HTMLAudioElement con streaming y eliminación de src al detenerse. No precarga las 54 voces ni almacena un banco PCM. El volumen sigue Sonidos. Cada reemplazo invalida su ticket; promesas y ended anteriores no pueden avanzar la lectura vigente. La voz dura lo que dura el audio real y conserva la velocidad original, independientemente de la simulación.

Ended usa el dismiss automático existente: reconoce la lectura y pasa a la siguiente explicación o cierra la última. En construir/plantar mantiene `guideAfterAuto`, mano y pausa de acción; no coloca ni cobra nada. Las acciones reales siguen siendo necesarias. Continuar detiene la voz y conserva esa guía; Cerrar la detiene y descarta la guía conforme a su comportamiento previo. Menús, contratación, pestaña oculta, cambio de idioma/partida, pagehide y error runtime limpian voces. Resultados usan un narrador de diálogo propio y excluyente con el Espíritu del HUD.

Autoplay rechazado, error de medio o carga/espera estancada de 12 segundos pasan a lectura silenciosa, con controles manuales y temporizador textual original. No marcan una lectura como completada por un error. Los resultados conservan sus botones manuales ante fallo de audio.

Tarjetas conservan nodos DOM/foco durante updates, permiten localizar su objetivo y cierre individual, e indican lifetime restante. Tienen como máximo tres tarjetas, dos en landscape corto, área segura y límite de altura con scroll. Una explicación del tutorial reemplaza para siempre su aviso duplicado de incursión o texto idéntico; avisos distintos esperan al tutorial, sus animaciones y superficies HUD. El tiempo ya visible se congela al ocultarse detrás de ellas.

## Evidencia y pruebas

`tests.txt`: 112 pruebas dirigidas correctas, incluyendo voces/hashes/catálogos, autoplay rechazado, carga colgada, stalled, reemplazos, ended tardíos, centro/plantado todavía pendientes, pausa/manos 2D/3D, tutorial/magia/resultados existentes, notices, localización y rutas de paquete. Build correcto; warning previo de bundle >500 kB sigue presente.

CUA Browser2, ventana coordinada con root y agente de impostores. Fixture nativo dirigido, no campaña simulada ni benchmark. Viewports 390×844 y 844×390; viewport restaurado y pestaña cerrada al acabar:

- `es-sequence.json`: audio ES_01 termina realmente y arranca ES_02, con mano/pause de construir.
- `es-center-ended.json`: ES_02 termina realmente; cero centros, texto cerrado, mano conservada y `tutorial-action` señalado.
- `action-after-manual-advance.json`: comando real `Game.placeStructure` en fixture con rutas controladas permite construir y cambia inmediatamente a ES_03; 1 centro y 0 plantas. La prueba unit de ended realiza también este mismo paso y conserva luego la guía de plantar.
- `language-switch.json`: EN_02 se sustituye inmediatamente por ES_02 para el mismo mensaje, con clock reiniciado y sin ended antiguo.
- `nested-en-playing.json` / `nested-en-ended.json`: EN_19 reproduce y su ended real cierra el último mensaje, liberando clip.
- `nested-autoplay-fallback.json`: autoplay rechazado sin gesto conserva texto, controles y fallback.
- `nested-load-fallback-after-text-timeout.json`: historial muestra `missing.ogg` → fallback sin ended, seguido del avance textual a ES_02. El error de 404 es deliberado en este botón QA.
- `manual-voice-close.json`: carga/reproducción de ES_02 se corta inmediatamente sin evento ended ni mensaje siguiente.
- `manual-toast-dismiss.json`: cierre individual reduce las tarjetas visibles; las imágenes portrait/landscape muestran iconos cargados, barra y espacio libre para acciones HUD.
- `es-portrait.png`, `en-landscape.png`, `cards-portrait.png`, `cards-landscape.png`: componentes nativos en viewports móviles. Los controles amarillos pertenecen solo al fixture.

`tools/serve_spirit_voice_qa.mjs` compila el fixture aislado y lo sirve bajo `/nested/itch/spirit/` sin fallback raíz. Se comprobó reproducción nativa ES/EN y carga de sprite/iconos desde esa ruta. El paquete principal verifica los 54 hashes de voz también después del build; 641 archivos, 386.397.521 bytes y 859 enlaces relativos. ZIP local 336.636.411 bytes, CRC correcto; no subido.

## Límites

No es aceptación de estabilidad global, mezcla subjetiva de volumen, rendimiento móvil físico, campaña completa ni prueba del ejecutable Tauri. Se conservaron las rutas del resolver compartido, pero Opus en WebView/Tauri antiguo puede caer al fallback textual si el sistema no lo admite. Los diálogos de resultado se integraron y su corpus/controlador se prueban; no se forzó una campaña raíz congelada hasta victoria/derrota para capturar esos diálogos. La extracción añade unos 7,55 MB a los recursos distribuibles.
