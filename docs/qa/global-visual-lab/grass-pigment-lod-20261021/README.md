# Pigmento LOD en cámaras normales

Control viento+normales frente a muestreo de pigmento convergente a raíz del módulo.12 capturas reales,semilla712,media,1280x720,tres cámaras,día/noche. Seis parejas con cámara/hora/draws/triángulos iguales,sin errores.

[Día normal](day-0-pair.webp) revisado: conserva paleta cálida y cobertura; hay cambios cromáticos en la franja LOD y distancia. No se aprecia una pérdida gruesa de variedad en esta vista, pero falta observación temporal. No inferir calidad únicamente por diferencias de píxeles. El [diagnóstico de extremo](../grass-pigment-endpoint-20261021/README.md) cuantifica reducción parcial del salto.

Sin nuevas muestras,texturas,instancias o triángulos respecto a candidata de normales. No hay benchmark de esta modificación final. Mantener como QA para animación y coste, sin integrar ni modificar main.

Reproducir: capture-grass-pigment-lod-20261021.mjs y package-grass-pigment-lod-20261021.py en tools/experiments,Vite5190. PNG locales;parejas y metadatos publicados.
