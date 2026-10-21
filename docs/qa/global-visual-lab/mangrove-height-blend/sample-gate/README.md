# Lecturas condicionales de barro: primera comprobación

Referencia: receta completa aprobada visualmente, con altura calibrada, color lineal aproximado, barro toon y omisión de iluminación sin peso. Candidata: mismas operaciones, pero color y normal de barro solo se leen cuando mossCover<1. ARH y derivadas de altura permanecen incondicionales. Opción gateSoilSamples desactivada por defecto; solo interceptación QA.

12 capturas reales, seis parejas, baja1280×720, semilla712, tres vistas cercanas, día150/noche350. Cámara, objetivo, tiempo, draw calls y triángulos iguales; sin errores registrados. [Día](day-pair.webp), [noche](night-pair.webp), [registros](captures.json), [diferencias](parity.json).

La candidata NO conserva RGB exacto: cambian 3101–7166 píxeles por pareja, diferencias máximas de19–25 diurnas y16–21 nocturnas. No atribuir todavía la causa a precisión ni declarar equivalencia artística. La igualdad de conteos no prueba igualdad de iluminación. Investigar dependencias de derivadas y operaciones posteriores a la rama antes de medir ahorro o proponer sustitución. No se ejecutó benchmark: no hay ahorro demostrado.

Se conserva intacta la receta visual aprobada. Esta prueba no la descarta ni reduce su prioridad. Solo demuestra que la primera reordenación de muestreo necesita diagnóstico adicional. No modifica producción, modelos, simulación ni main.

Reproducción: node tools/experiments/capture-mangrove-sample-gate.mjs con Vite5190. PNG individuales locales; pares lossless y trazas publicados.
