# Perfil muy bajo: arranque y render GPU

Seis capturas reales de la opción integrada, normal/elevada/inversa día/noche,1280×720, semilla712, perfil muy_baja. Cero errores de página/shader/WebGL. La normal nocturna se inspeccionó: mezcla musgo/barro visible y edificios legibles; no equivale a evaluación artística exhaustiva del perfil. PNG y conversiones WebP lossless locales; metadatos captures.json.

Esta prueba confirma que los materiales Basic del suelo y de los bordes compilan en GPU con vToonLowNormal. No mide FPS, no compara contra calidad media, no prueba cambios de calidad en caliente ni streaming en muy_baja. La opción completa sigue siendo explícita, con coste pendiente de validación en este perfil.

Reproducir: `node tools/experiments/capture-mangrove-very-low.mjs`, servidor5190. Solo candidate/combined integrado, sin ayudanteQA ni control visual de esta serie.
