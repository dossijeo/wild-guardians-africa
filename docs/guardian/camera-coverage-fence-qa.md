# Camera coverage and tutorial guide QA findings

An experimental opt-in snapshot joined the authoritative terrain manifest to the renderer's structure and tree data and was exercised with real WebGPU Workers, including device loss and reattachment. It expired on the next authoritative publication and had no production consumer, so the fence was removed. It cannot provide persistent coverage for automatic camera focus.

A temporary tutorial-guide presentation was tested in the real early QA game. The guardian appeared after a mouse drag, but the dialogue obscured it. Conservative HUD and world occlusion exclusions prevented that false positive; twelve subsequent drags found no accepted view, while the simulation continued without a tutorial-action pause. The guide consumer and its flag were removed because unobstructed visibility was not demonstrated. Camera focusing, HUD occlusion, moving actors and complete tutorial progression remain unresolved; no conclusion about visual parity or production readiness follows from this experiment.

## Encadenamiento real de centro y cultivo

`tools/experiments/audit_early_tutorial_chain.mjs` abre una partida nueva QA con WebGPU y sin WebGL principal, cierra los diálogos por la interfaz, construye un centro y planta un cultivo mediante clics reales. Con fuentes congeladas, la ejecución del 5 de noviembre de 2026 registró una sola navegación, `PlacementCommitted`, `CropPlaced`, un centro y un cultivo confirmados, desaparición del preview y avance al paso `hire`, sin errores del navegador. La simulación y la presentación usan sus Workers reales. El runner se puede lanzar con `QA_BASE_URL` apuntando al servidor Vite y Playwright disponible en `NODE_PATH`.

Esta prueba no demuestra la guía visual sobre el mundo, que sigue desactivada, ni completa contratación y pasos posteriores; prueba la cadena funcional de esos dos pasos en la ruta QA temprana.

## Gesto táctil durante el dibujo de murallas

En el controlador temprano QA sin WebGL, el paneo con dos dedos ya no depende de mallas de terreno inexistentes en el hilo principal. El gesto proyecta los dedos sobre un plano a la altura del objetivo de cámara y pasa por la protección de terreno confirmado. `tools/experiments/audit_early_gpu_multitouch.mjs` prepara un guardado con 25 sectores y comprueba con WebGPU real que el gesto mueve la cámara mientras está seleccionada una muralla; la ejecución observó un desplazamiento de 1,29 unidades sin errores de navegador.

Es una aproximación experimental: no se ha verificado la equivalencia visual en pendientes ni en todos los zooms y dispositivos. La prueba anterior con solo dos sectores no permitía mover la cámara por falta de cobertura confirmada. No se ha activado esta ruta QA como sustituto general del controlador de producción.
