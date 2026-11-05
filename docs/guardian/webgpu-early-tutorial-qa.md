# Tutorial en arranque temprano (QA)


Con `qa-worker-early-tutorial` junto a los flags de `qa-worker-early-gpu-view`, el arranque temprano crea el puente de tutorial autoritativo existente y presenta sus diálogos mediante el espíritu 3D. El hilo principal envía órdenes de presentación/avance al Worker y actualiza la interfaz; no adelanta las reglas. La guía de mundo aún no existe en la presentación temprana, por lo que no se comunica como objetivo visible ni se crea una pausa de tutorial por una mano invisible. El resto de la ruta temprana conserva sus restricciones QA; no se considera un tutorial completo ni una integración de producción.

`tools/experiments/audit_early_gpu_tutorial.mjs` ejecuta partida nueva real en WebGPU y Worker, verifica `basic.introduction`, pulsa Continuar, confirma `basic.center`, guarda mediante hook exclusivo DEV sin abrir el menú y restaura el mismo diálogo pendiente en el mismo slot. El menú normal conserva su semántica de interrumpir el diálogo. Quedan pendientes la guía 3D de colocación, contratación, magias, el resto de fases del tutorial y su validación visual/funcional en una partida completa.
