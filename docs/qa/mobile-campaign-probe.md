# Registro móvil de incursión y amanecer

Abrir `tests/browser/mobile-portrait.html` mediante el servidor local. El marco 390 × 844 contiene `mobile-first-day.html`, que utiliza el menú, selector, HUD, mundo, navegación y simulación de producción. Las partidas permanecen aisladas en memoria; no utiliza los slots del jugador. El cambio de orientación conserva el documento de la partida.

El diagnóstico `qaPlayer` añade hasta 300 eventos y 100 transiciones observadas: aparición y estados de animales, salud de centros, pausas de contratación, resultado, noches completadas, avisos visibles y transición de día. Registra el punto de aparición y salida, la referencia de cámara usada por navegación, posición proyectada y pertenencia del centro del actor al frustum. La pertenencia al frustum no acredita ausencia de oclusión ni visibilidad del modelo completo.

El muestreo existente solicita actualización cada 500 ms de tiempo real. Las horas registradas son horas de observación, no timestamps originales del evento. No acelera el reloj, ejecuta acciones, concede dinero ni cambia probabilidades. Los campos `campaignEvents`, `campaignPhases`, `raid`, `raidView`, `completedNights`, `result` y `nightPlan` se leen desde el DOM de la prueba.

Validación actual: sintaxis del módulo comprobada con Node. La ejecución del nuevo registro permanece pendiente: la pestaña 232 figura abierta, pero lectura, captura y recuperación de su mismo handle agotaron el plazo de la API. No se declaró terminada ni se reinició esa partida a partir de esos timeouts. La prueba antigua de audio 223 presenta también consultas de contenido agotadas y se conserva sin atribuirle un resultado.

Esta instrumentación no es una prueba de teléfono físico, tacto, DPR, FPS ni aceptación visual de primera incursión/amanecer. La primera entrega guiada anterior está acreditada por `tutorial-action-first-day.json`; no debe confundirse con el registro nuevo.
