# Gran Cañón: cielo visible con receta actual

Capturas nuevas a 1280x720, perfil medio, semilla/fixture poblada del harness existente, simulación pausada. pose.json eleva exclusivamente la cámara QA para ver cielo y mesetas. No cambia la cámara de producción. report.json conserva URL, estado y condiciones. Comprobados cámara, objetivo y elapsed idénticos entre imágenes; hora visual 170/350, GL=0, únicamente advertencias X4000 conocidas.

Inspección directa de report-day.png y report-night.png: nubes pequeñas y bruma separan el relieve lejano de las paredes cálidas durante el día. Por la noche el cielo se oscurece, las estrellas aparecen y las mesetas siguen legibles. El HUD ocupa las esquinas, pero queda una región central amplia de cielo. No se aprecia una discordancia que justifique modificar el ajuste atmosférico elegido. La meseta es relativamente uniforme; esto corresponde al terreno y no prueba un fallo del cielo.

Conservar skyAtmosphere=clouds. Este encuadre cubre la carencia de cielo visible del recorrido anterior del Cañón, pero no constituye una prueba de todas las rotaciones, cénit, streaming activo ni transición completa de día/noche. No usar sus 20 frames como benchmark.

Reproducción: capture-canyon-sky-visible.mjs, WG_THREAD_PORT=5190, WG_CURRENT_REVIEW=1, WG_THREAD_BIOME=gran-canon, WG_THREAD_QUALITY=media, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_THREAD_DEFAULT_STREAMING=1, WG_FRAME_SCHEDULER=1, WG_THREAD_BENCH=1, WG_THREAD_FRAMES=20, WG_THREAD_DISTANCE=0, WG_THREAD_POSE_FILE a pose.json, WG_THREAD_REPORT a una salida nueva. El wrapper crea y borra una copia temporal del harness; no modifica archivos de producción. Navegador cerrado al finalizar.
