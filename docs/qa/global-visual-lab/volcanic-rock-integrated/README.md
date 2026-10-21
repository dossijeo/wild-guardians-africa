# Receta volcánica integrada, optativa

Activación: `?visualLab=global-lighting&volcanicRock=layered`. Sin esa combinación se conserva el material anterior. Solo Volcanes recibe escala .06, relieve .44, máscara regional de ceniza condicionada por altura e interpolación de la intersección POM. No se añaden geometría, texturas ni pasadas. La lectura adicional de altura para ceniza y el límite de ocho muestras POM son los del prototipo validado.

Comparación real contra la receta QA anterior: semilla 712, media, 1280×720, tres cámaras y día/noche. Las seis parejas son idénticas píxel a píxel; cámara, hora, draw calls y triángulos coinciden. Sin errores registrados. `captures.json` y `comparison.json` contienen los resultados; `day-parity.webp` muestra QA a la izquierda e integración a la derecha. Reproducción: Vite en 5190 y `node tools/experiments/capture-volcanic-rock-integrated.mjs`.

Cinco pruebas dirigidas de ceniza/roca pasan y `npm run build` termina correctamente, con avisos de tamaño de bundles e importación mixta. Esta ejecución verifica integración y paridad, no rendimiento nuevo. Los costes y movimiento medidos se conservan en `../volcanic-pom-refined/`; la cadencia fue mixta y no se afirma una mejora uniforme de FPS.

Recomendación: conservar como opción experimental. Persisten líneas duras en normales/reflejos y las limitaciones de POM sin silueta ni intersección física de dos capas. La calidad global de los seis mockups sigue sin estar demostrada.
