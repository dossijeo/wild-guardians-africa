# Humo nativo detrás de un objeto parcialmente oculto

Diagnóstico Sabana baja seed712,1280x720,día150,view17. Usa BuildingEffects, sus shaders de humo y BuildingDestructionPass.renderSmoke/captureDepth reales. Como la partida cargada no tiene emisores DEST, se construye un NativeBuilding temporal con plantilla mapungubwe, sin añadir su geometría a la escena ni ninguna entidad a la simulación. Se inyectan doce partículas diagnósticas detrás de la caja del árbol seleccionado; después se restaura su estado y se destruye el emisor. No se provocan daños ni cambios de reglas.

Para aislar la contribución de la profundidad se oculta el color de los parciales en ambas condiciones y se mantiene visibilidad35%. Se comparan profundidad aislada activa/inactiva y humo presente/ausente. Fondos exactos;583070 píxeles con señal de humo>20/255 en ambos casos, cero que pasen de señal>20 a<2. Cero errores WebGL. La imagen de humo es deliberadamente extensa para detectar bloqueo; no representa la densidad artística de juego ni una prueba de rendimiento. Lámina: izquierda aislada activa, derecha inactiva.

La prueba demuestra que esta ruta de humo no recibe una silueta opaca adicional del depth aislado en esta escena. No certifica composición de color correcta con el árbol visible, todas las partículas/VFX, noche o combate. El wrapper todavía intercepta renderizaciones de la escena destinadas a otros targets (como smokeDepth): puede repetir trabajo auxiliar, que debe evitarse y medirse antes de integrar. No se declara optimización de FPS.

Reproducción Vite5190: `node tools/experiments/capture-isolated-smoke-probe.mjs`; `python tools/experiments/package-isolated-smoke-probe.py`. Resultado en probe.json/analysis.json. Se conserva en QA, main intacta.
