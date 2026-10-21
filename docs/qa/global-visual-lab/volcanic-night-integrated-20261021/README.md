# Ambiente nocturno volcánico integrado como opción

Activación: `visualLab=global-lighting&volcanicNight=ambient`. Solo suelo mapeado de Volcanes; opt-in explícito, sin cambio predeterminado. Aumenta por1.65 el extremo nocturno del ambiente antes de interpolar. Conserva luz directa, AO, sombras, materiales de objetos, texturas y modelos. Clave de programa distingue la opción.

30 capturas reales comparan receta QA corregida (izquierda) y opción integrada (derecha), semilla712, media,1280x720, tres cámaras y cinco factores nocturnos0/.25/.5/.75/1 mediante reloj real. Las15 parejas son idénticas píxel a píxel. Cámaras, objetivos, hora, factor nocturno, draws y triángulos iguales; cero errores. [Mitad del anochecer](half-0-pair.webp), [noche](night-0-pair.webp).

Validación:5 tests existentes global-visual-lighting/global-volcanic-rock pasan; npm run build pasa, con avisos de importación mixta y tamaño de chunks. Los tests existentes no cubren exhaustivamente esta nueva opción: la evidencia principal de integración es la comparación real de renderizado.

No añade muestreos, geometría ni pasadas. El benchmark de la formulación anterior está en [costes](../volcanic-night-components-20261021/performance/README.md); no sustituye medición de esta versión final. Pendientes amanecer, streaming/horizonte, perfiles modestos y benchmark final. Es integración experimental utilizable, no validación global completa ni autorización para main.

```text
node tools/experiments/capture-volcanic-night-integrated-20261021.mjs
python tools/experiments/package-volcanic-night-integrated-20261021.py
```

Vite5190. Mantener recetas QA anteriores para reproducir comparaciones. PNG locales; parejas y metadatos publicados. Recomendación: conservar opción y continuar validación antes de incorporarla al conjunto global por defecto.
