# Cambios de calidad en caliente: material de barro y sombras

Secuencia real media → muy_baja → baja → media, día y noche, Manglares integrado seed7121280×720. Ocho capturas sin errores GPU/página. Al regresar a media, RGB idéntico a la captura inicial en ambas fases.

La prueba previa encontró154831píxeles distintos de día al regresar: las sombras desaparecían. Invalidar los programas de materiales cuando cambia shadowMap.enabled restablece sus defines de sombras. La evidencia previa permanece local en ../quality-switch/. No atribuir esa pérdida al material de musgo; afectaba también edificios y otros objetos.

Los parches de barro antes quedaban fuera de updateGroundQuality. Ahora participan cuando la opción de Manglares está activa; al sustituir Standard/Basic se reaplica su receta de borde usando las mismas texturas. Se conservan los24meshes y UUID de geometría; cada material reemplazado se libera una vez. Máscaras25 constantes. Contadores de retorno177geometrías/65texturas como al inicio, frente a174/63 en los perfiles bajos. No son mediciones de VRAM ni prueba de fugas prolongadas.

Tres pruebas unitarias pasan, incluyendo sustitución de material conservando textura y callback de iluminación. Build411módulos correcto, advertencias existentes. No benchmark nuevo: el coste CPU de la integración sigue pendiente de aislar. La invalidación de sombras es común al renderizador; todavía falta repetir el recorrido de calidad en los otros biomas.

Reproducir: `node tools/experiments/capture-mangrove-quality-switch.mjs` y `python tools/experiments/package-mangrove-quality-switch.py`, servidor5190. El verificador exige retorno RGB exacto, además de máscaras estables. Capturas PNG/WebP locales; captures.json y summary.json versionados.
