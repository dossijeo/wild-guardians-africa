# Fundido con superficie más cercana por objeto

Prototipo QA para la petición del usuario: evitar capas internas al transparentar un árbol. Usa la misma geometría FrontSide y alpha suave de la rama; añade una pasada de profundidad aislada por instancia parcial visible. El shader de color descarta fragmentos posteriores a la profundidad del propio objeto. No escribe esa profundidad en el destino principal: los otros objetos transparentes no reciben deliberadamente una silueta opaca auxiliar.

Sabana baja, semilla712,1280×720, cuatro vistas día/noche, dieciséis capturas. Cámaras/objetivo/hora/número de parciales coinciden. Sin errores registrados. Vista0 no tiene parciales y es idéntica; vistas9/17/35 tienen dos. La vista17 muestra reducción clara de capas superpuestas en la copa cercana; el fondo se ve con una capa de color más uniforme. No es opacidad cero ni desaparición del árbol: permanece el fundido solicitado. Conservar candidata artística, no reemplazada por dithering.

Control izquierda, superficie aislada derecha en las ocho láminas. La pasada extra no elimina triángulos enviados: vuelve a dibujar cada parcial en profundidad y filtra fragmentos de color posteriores. No afirmar beneficio de culling ni FPS. El contador renderer.info de la captura solo refleja la última renderización; depthDraws cuenta invocaciones acumuladas de prepasada, no coste temporal. No usarlo como benchmark.

Limitaciones: targets completos1280×720 con colorRGBA8 y profundidaduint32, ~7.03MiB nominales cada uno sin overhead del driver. Se alcanzan tres targets conservados para slots, aunque solo dos parciales visibles en estas vistas: ~21.09MiB nominales. Falta pool/scissor o reducción de resolución con validación de bordes. Sesgo fijo de profundidad2e-7, falta validar distancias, MSAA, origen flotante, clipping y otras geometrías. No se ha ejecutado aún la prueba de humo/transparentes detrás, ni benchmark GPU/CPU, ni movimiento continuo. La ausencia de escritura al depth principal es arquitectura, no sustituto de esa prueba.

La selección es por instancia, no una sola capa para todos los árboles: dos árboles superpuestos pueden contribuir ambos. La profundidad conserva alpha maps y clipping por la receta standardDepthMaterial, pero necesita comprobación visual en todos los materiales. No se modifica Engine, navegación, modelos originales ni producción.

Reproducción: Vite5190 y `node tools/experiments/capture-obstruction-isolated-depth.mjs`. Código qa-isolated-fade-depth.js; capturas.json y comparison.json. La ruta QA añade referencia al material fuente solo para construir su receta de profundidad. Rama experimental; main intacta.

[Prueba de transparente posterior](../obstruction-isolated-transparent-probe-v2/README.md): fondos exactos y859680 píxeles de marcador visibles con/sin prepasada, cero bloqueados. Diagnóstico acotado; no certifica humo/efectos reales ni rendimiento.

