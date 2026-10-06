# Índice de audio: cuatro continuaciones renderizadas

Sobre 7779a8e, el visor de finca avanzada añade una comparación específica de las actualizaciones de audio agrícola separadas frente a la llamada compartida. Ambas usan los mismos módulos actuales. Se continúa el guardado histórico Manglares/Saheliana, pagando 18 trabajadoras mayores. Cámara, estado inicial, calidad media, sombras y shader analítico permanecen iguales. Quince segundos simulados de calentamiento y veinte medidos por lote; `advanceReal(0.1)` por RAF, sin ritmo variable de producción.

Los observadores de audio tienen reloj de contexto controlado y una fábrica de voces que devuelve null. Se mide la lógica real de consulta/selección de sonidos dentro del frame 3D; no se crea AudioContext ni se descodifica/reproduce música o SFX. Esta separación evita atribuir el coste de reproducción al índice, pero limita el alcance a esos observadores.

| Lote | Índice compartido | CPU audio mediana / p95 ms | CPU render mediana ms | Intervalo RAF mediana ms |
| --- | --- | --- | --- | --- |
| A1 | No | 0,20 / 4,10 | 43,80 | 66,10 |
| B1 | Sí | 0,20 / 5,20 | 50,20 | 71,00 |
| B2 | Sí | 0,20 / 5,50 | 51,50 | 75,10 |
| A2 | No | 0,20 / 5,30 | 51,30 | 72,50 |

800 muestras CPU y 800 queries completas, sin disjoint, descartes ni pendientes. Viewport y framebuffer efectivos: 1280×720, DPR ≈1; no se comparan directamente con informes históricos a 1600×900. El intervalo de query abarca el render y la pausa de envío mientras se ejecuta el observador de audio; no se interpreta como coste puro de un pase ni como ganancia GPU de esta optimización CPU. Campañas largas concurrentes; sin otros builds/tests propios durante el ensayo.

Los cuatro lotes conservan hashes de setup/estado final, cámara, búsquedas de ruta (89), secuencia completa de cues (48), eventos físicos y envíos de render idénticos por frame. Final: 35 s, 841 monedas, 18 trabajadores, 186 cultivos vivos. Durante medición: 17 entregas, 23 recogidas, dos riegos y tres maduraciones/órdenes de cosecha. Reporte y consola sin errores; pestaña cerrada y viewport restaurado.

La mediana de audio es igual en ambos brazos y el p95/frametime varían entre lotes sin mejora consistente. No se acredita ganancia de fluidez integrada; el ahorro aislado anterior con 100 trabajadores/1.000 tareas no se extrapola a esta finca de 18 trabajadores. La siguiente prioridad sigue siendo el coste del render/profundidad y medir poblaciones más grandes, junto a aceptación funcional. No demuestra móvil, RAM, audio perceptual, HUD, autosave, incursión ni campaña de 100 noches.

Reproducir: `node tools/prepare_late_farm_render.mjs`, Vite y botón «Comparar índices de audio A/B/B/A» de `tests/browser/late-farm-render.html`. La preparación requiere la referencia histórica 1bfd85a existente para los otros modos del visor. Datos completos comprimidos, prueba de igualdad/hash y captura adjuntos.
