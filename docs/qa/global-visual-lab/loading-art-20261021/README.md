# Pantalla de carga: primera comparación de atmósfera

Capturas del LoadingDiorama real, preparado con los recursos del juego, semilla 712, 1280×720, cámara (4.8,3.1,6.4), cuatro plantas y progreso 75 %. Día 150 y noche 350. La simulación está pausada. No son mockups.

- `base-day.png`, `base-night.png`: implementación actual.
- `atmosphere-day.png`, `atmosphere-night.png`: candidato de cielo existente más bruma diurna menos gris y ligeramente menos opaca, aplicado mediante rutas QA.

La revisión visual encuentra una mejora moderada del fondo diurno; no resuelve todavía la separación del maíz y el suelo. No se promueve como pantalla final. La noche conserva lectura, pero el foco central resulta muy intenso. Próximo pase: contacto con suelo y composición completa con overlay, interacción y formatos móviles.

Ambas variantes conservan cámara, plantas y contadores finales de escena (4 draws, 16048 triángulos), sin errores JS ni WebGL. Estos contadores corresponden a la última llamada render, no incluyen todas las pasadas de cielo/bruma. No se han medido costes GPU/CPU ni duración de carga; no afirmar coste equivalente a partir de esos contadores.

El harness captura el diorama después de preparar una partida: excluye overlay HTML y no valida el flujo real de carga, cancelación o interacción. No modifica código de producción.

Reproducir con Vite en 5190: `node tools/experiments/capture-loading-art-20261021.mjs`; para candidata, establecer `WG_LOADING_VARIANT=atmosphere`. Los archivos de salida se reemplazan al repetir.
