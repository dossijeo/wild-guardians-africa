# Cubierta de Manglares conectada al streaming

Helper QA enlaza chunk/release/flush/markDirtyAt/dispose de la capa existente y conserva su objeto, instancias y suscripciones. No cambia simulación, navegación ni eventos del motor. Restauración de descriptores/métodos al desmontar; no elimina texturas compartidas. La cubierta sigue usando datos de terreno residentes y su suscripción visual a eventos.

Seis parejas reales día/noche, semilla712,media,1280×720: imágenes exactamente iguales al helper LOD anterior, geometría y cámara iguales, sin errores. Comparativas día/noche y equivalence.json. Esta integración funcional no pretende cambiar apariencia.

Recorrido asentado de cinco posiciones con offsets0,96,192,96,0: en cada paso las claves de cubierta coinciden exactamente con los25chunks residentes. Caché de tiles104,94,60,80,80; descarga elimina tiles de chunks retirados. Contadores globales de geometrías187,110,108,123,111 y texturas62,55,52,57,57: no crecimiento monotónico, pero NO prueba de ausencia de fugas ni medición VRAM. Tres desplazamientos no son una sesión prolongada.

Invalidación manual de ocupación seguida del flush real limpia el indicador pendiente. Esto valida el enlace, no una campaña con construcciones/destrucciones reales. Al disponer el helper: cero chunks/tiles propios, objeto groundDetails conservado y sus cinco métodos idénticos a los originales, render posterior sin error. No se ejercitó aún dispose del mundo con overlay activo ni repetición masiva de instalación/desmontaje.

No se midieron latencias,CPU/GPU o FPS. Esperar chunks en esta prueba no reproduce tirones de streaming. Pendientes eventos reales,calidad baja,costes y recorridos prolongados. Mantener como integración QA candidata, no producción ni objetivo global cumplido.

Reproducir con Vite5190: node tools/experiments/capture-mangrove-leaf-stream-20261021.mjs; python tools/experiments/package-mangrove-leaf-stream-20261021.py. PNG completos locales regenerables, láminas y resultados publicados.
