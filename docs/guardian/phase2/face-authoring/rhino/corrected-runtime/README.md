# Boca inferior y párpados recompuestos

Candidato: C:/tmp/guardian-faces/rhino-corrected-full.blend/.glb, generado desde oral-v8 con los dos perfiles laterales existentes. Exportación restaura los canales originales.

Pruebas reales en Three.js: carga sin errores, 5 draw calls, 10 enlaces de morph; neutral lateral; dolor (ojos cerrados y boca 0.85); Running a 0.4 s con esa expresión desde el lado opuesto. En esta muestra los párpados y labios permanecen unidos al rostro. La boca abre bajo el hocico, conservando la nariz. Los controles tapaban parcialmente la mandíbula en las primeras capturas: el encuadre se bajó para running-pain.png.

No equivale a validar todos los fotogramas ni el ciclo de combate. Falta la prueba en Wild Engine, recuperación, revisión de posibles pliegues interiores, empaquetado e instalación. El catálogo continúa usando el original.

## Ciclo de combate del candidato

Ejecutado en WorldScene y Game.tick: 12.073 segundos simulados, caída, giro, recuperación y vuelta a caminar; cero errores, cero estados magicDown al finalizar. combat-impact-profile.png muestra boca abierta y párpados cerrados durante Attack con iluminación diurna real. combat-cycle.webm registra un segundo ciclo; inspeccionada una hoja de doce fotogramas a 1 Hz: caída, posición supina, apoyo para incorporarse y retorno de pie. Esta muestra amplia no demuestra ausencia de penetraciones pequeñas ni continuidad perfecta entre fotogramas. Audio desactivado.

Medición diagnóstica no comparativa: frametime p95 33.60 ms, p99 49.99 ms; física total p95 6.63 ms, máximo 39.96 ms; creación inicial 17.04 ms. No se atribuye regresión ni se declara rendimiento aprobado con esta muestra. Pendiente comparación controlada y revisión cercana de apoyos.

## Compresión del candidato

52,311,464 → 10,278,984 bytes. Los dos atlas de párpados usan WebP lossless mediante hashes explícitos; el resto conserva la receta habitual. Se detectó que la verificación incluía RGB de texeles con alfa exactamente cero, que WebP puede descartar: ahora excluye únicamente esos canales invisibles del RMSE, verificando todos los valores alfa y todo RGB con alfa no nulo. El umbral PSNR permanece 32; mínimo visible obtenido 37.55 dB; atlas lossless sin error visible; 4,172,704 bytes geométricos/animaciones exactos y cero errores glTF. Pendiente comprobar en navegador esta versión comprimida antes de instalarla.

## Candidato portable y GLB comprimido en navegador

compressed-pain.png/json: GLB comprimido cargado en Three.js, 10 bindings de morph, 5 draw calls, ningún error; revisado perfil derecho con boca 0.85 y ojos cerrados. Fuente editable y GLB quedan en content/source/actors/rhino, y ambas herramientas QA apuntan ahora a ese archivo versionado, eliminando su dependencia del GLB temporal. El catálogo de producción sigue pendiente.

## Integración de catálogo en curso

Activo: assets/34b30faf0194b34477ce037b2d45b2a3a9a042f2095b893beae0e99a7d1beea4.glb, original conservado. Datos de acciones y pasos regenerados. El horneado inicial falló en rhino/downBack; escanear todos los vértices al ajustar el casco convexo inicial resuelve las ocho direcciones. Caché de soportes conserva el coste posterior reducido. Los 40 clips horneados regenerados y 18 pruebas de ragdoll/clips pasan. La batería ampliada tenía dos fallos que requieren investigar: fixture de contacto de tres hienas y referencia de punta de cola del jabalí. No se declaran resueltos ni se atribuyen al rinoceronte. Pendiente prueba gráfica cargando el catálogo sin override tras este cambio de colisionador.

## Catálogo instalado: noche

installed-night-cycle.json confirma faceCandidate=false, ciclo completo y finalDownCount=0 sin errores tras la recalibración. installed-night-impact.png inspeccionada: boca inferior abierta y párpados cerrados durante Attack, Guardián y vórtice visibles bajo iluminación nocturna. No representa la matriz completa de terrenos/ángulos ni una prueba de sonido.
