# Boca inferior y párpados recompuestos

Candidato: C:/tmp/guardian-faces/rhino-corrected-full.blend/.glb, generado desde oral-v8 con los dos perfiles laterales existentes. Exportación restaura los canales originales.

Pruebas reales en Three.js: carga sin errores, 5 draw calls, 10 enlaces de morph; neutral lateral; dolor (ojos cerrados y boca 0.85); Running a 0.4 s con esa expresión desde el lado opuesto. En esta muestra los párpados y labios permanecen unidos al rostro. La boca abre bajo el hocico, conservando la nariz. Los controles tapaban parcialmente la mandíbula en las primeras capturas: el encuadre se bajó para running-pain.png.

No equivale a validar todos los fotogramas ni el ciclo de combate. Falta la prueba en Wild Engine, recuperación, revisión de posibles pliegues interiores, empaquetado e instalación. El catálogo continúa usando el original.

## Ciclo de combate del candidato

Ejecutado en WorldScene y Game.tick: 12.073 segundos simulados, caída, giro, recuperación y vuelta a caminar; cero errores, cero estados magicDown al finalizar. combat-impact-profile.png muestra boca abierta y párpados cerrados durante Attack con iluminación diurna real. combat-cycle.webm registra un segundo ciclo; inspeccionada una hoja de doce fotogramas a 1 Hz: caída, posición supina, apoyo para incorporarse y retorno de pie. Esta muestra amplia no demuestra ausencia de penetraciones pequeñas ni continuidad perfecta entre fotogramas. Audio desactivado.

Medición diagnóstica no comparativa: frametime p95 33.60 ms, p99 49.99 ms; física total p95 6.63 ms, máximo 39.96 ms; creación inicial 17.04 ms. No se atribuye regresión ni se declara rendimiento aprobado con esta muestra. Pendiente comparación controlada y revisión cercana de apoyos.
