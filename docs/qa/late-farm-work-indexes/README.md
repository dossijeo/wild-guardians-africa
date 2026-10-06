# VFX de trabajo en una finca avanzada renderizada

Cuatro lotes nativos A/B/B/A de una continuación real archivada de Manglares/Saheliana. Se inicia postgame y se contratan 18 trabajadoras pagando 540 monedas. Todas las simulaciones y Navigation son actuales; solo se sustituye el gestor WorkVfx por la copia de `067e91a` en A. Esa copia cambia únicamente las rutas de sus dos imports a las dependencias locales, verificadas sin cambios respecto a la referencia. En B se usa el gestor actual con índices diferidos. Las herramientas ocultas están suprimidas en los cuatro lotes, así como la preparación de profundidad de subárboles invisibles.

15 segundos simulados de calentamiento y 20 medidos, 200 muestras por lote. Cámara, calidad media, sombras, viewport 1280×720 y buffer 1600×900 iguales; Intel UHD/ANGLE D3D11. El visor usa `advanceReal(0.1)` por RAF, **no** el ritmo variable de producción. Sin audio, HUD, autosave, incursión ni aceptación móvil/RAM. Las campañas congeladas PID 20608 y 36076 continuaban vivas; no se ejecutaron otros tests/builds propios durante los lotes.

| Lote | Índices diferidos | CPU render mediana ms | Intervalo RAF ms | GPU ms |
| --- | --- | --- | --- | --- |
| A1 | no | 44,55 | 67,20 | 62,11 |
| B1 | sí | 51,60 | 73,60 | 60,25 |
| B2 | sí | 57,50 | 79,40 | 62,71 |
| A2 | no | 55,10 | 78,65 | 60,37 |

**No se acredita mejora estable de frametime/FPS en esta finca activa.** En los 800 fotogramas medidos hay entre dos y nueve trabajadores actuando, por lo que el índice sigue siendo necesario cada vez. Existe variación temporal considerable entre lotes, incluido A1 frente a A2; no atribuir diferencias de GPU a un cambio del planificador CPU ni sumar tiempos CPU/GPU. El ahorro aislado sin actividad registrado en [la implementación anterior](../lazy-work-vfx/README.md) no se extrapola a este recorrido.

Los cuatro lotes mantienen la misma mediana de 637 llamadas y 5.135.701 triángulos (todos los pases sumados), 89 búsquedas de ruta y el mismo hash del estado completo final. Durante la ventana medida: 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha. Estado final: 35 s, saldo 841, 18 trabajadores y 186 cultivos vivos. La igualdad compara estados finales, no todos los intermedios. Consulta las [800 muestras CPU/GPU](native.json) y [hashes de fuentes/evidencia](proof.json).

Captura [farm.png](farm.png) revisada; consola sin errores y comprobación WebGL del visor correcta. Contadores de geometrías/texturas no son bytes ni prueba de ahorro de RAM. No acredita cien noches actuales ni todos los biomas/culturas.

Reproducir con `node tools/prepare_late_farm_render.mjs`, referencia congelada de Game/Navigation 1bfd85a disponible para los imports del visor y servidor Vite. Abrir `/tests/browser/late-farm-render.html` y pulsar «Comparar índices de VFX A/B/B/A». La siguiente oportunidad es evitar reconstruir el índice histórico durante trabajo activo, con invalidación comprobada al cambiar las colecciones; después habrá que volver a medir el render.
