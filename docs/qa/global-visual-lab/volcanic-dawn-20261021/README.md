# Amanecer volcánico: paridad QA/integrada

30 capturas, día2 del reloj real, cinco factores nocturnos1/.75/.5/.25/0, tres cámaras. Semilla712,media,1280x720. Compara receta QA corregida con opción integrada volcanicNight=ambient.15 parejas exactas píxel a píxel; cámara/hora/factor nocturno/draws/triángulos coinciden, sin errores. Factor nocturno comprobado contra los cinco valores esperados.

[Mitad del amanecer](half-0-pair.webp). La prueba confirma paridad de integración en cinco estados de amanecer; no constituye vídeo continuo, campaña funcional del día2 ni validación de streaming. El mundo está pausado y el reloj se posiciona deliberadamente. No demuestra ausencia de todo artefacto temporal.

El [benchmark integrado](../volcanic-night-integrated-20261021/performance/README.md) incluye una repetición más lenta y no aprueba aún rendimiento. Conservar la opción visual, pendiente alternancia en la misma página y streaming. No integrar en main.

```text
node tools/experiments/capture-volcanic-dawn-20261021.mjs
python tools/experiments/package-volcanic-dawn-20261021.py
```

Vite5190. PNG locales, parejas y metadatos publicados.
