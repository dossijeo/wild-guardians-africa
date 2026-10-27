# Mezcla barro-musgo: descarga y retorno

Campaña real, semilla712, Manglares, 1280×720 DPR1, calidad media/baja, día150/noche350. Cámara desplazada a 0/144/288/0 metros; espera de chunks y horizonte antes de cada pose. 32 capturas finales, 16 parejas A/B con cámara, chunks, draw calls y triángulos idénticos. A original; B transición con interior toon. Imágenes individuales WebP RGB sin pérdida verificadas; `*-pair.webp` son vistas de revisión reducidas, izquierda A, derecha B.

Reproducir con servidor del laboratorio5190: `node tools/experiments/check-mangrove-mud-streaming.mjs`, después `python tools/experiments/package-mangrove-streaming.py`. `WG_COVER_QUALITY` permite elegir perfil.

## Corrección encontrada

El primer recorrido reveló que el original oculto de los nuevos chunks no pasaba por AfricanToon: al desactivar la candidata mostraba iluminación estándar. Se conserva el piloto en `pilot-unregistered-baseline` (JSON y vistas seleccionadas), excluido de la comparación final. El helper ahora registra explícitamente el material original antes de ocultarlo; AfricanToon evita duplicar su registro. No cambia la receta candidata ni requiere repetir el benchmark de vista fija, cuyos materiales originales ya estaban registrados.

## Resultado

La frontera suavizada sigue siendo visible al regresar y en los chunks nuevos. Conserva color terroso y separación de zonas húmedas, pero no resuelve la repetición del musgo. La vista a144m está dominada por agua: sirve para descarga, no para demostrar beneficio del barro.

Por calidad se observaron69 geometrías de barro y69 materiales candidatos; cada uno emitió exactamente un dispose al terminar.48 se habían descargado antes del retorno;21 enlaces residentes al regresar y cero al cerrar. Cierre repetido de WorldScene sin duplicación observada. Cero errores JS/WebGL; cero máscaras/texturas de BiomeGround después del cierre. No prueba todos los buffers GPU, el material original oculto ni fugas de larga duración; los contadores de Three son objetos, no VRAM.

El retorno conserva cámara, chunks, draw calls y triángulos: media61/632708; baja56/490836. No es idéntico RGB. En candidata cambian5294/2266 píxeles día/noche media y5379/2246 baja; MAE global0,00118–0,00286 sobre255. También cambia el original:5131/2212 y5209/2246. Tras corregir su registro, las diferencias entre ambos deltas de retorno quedan en167/58 y176/62 píxeles. Esto acota la discrepancia, pero no demuestra su causa; no atribuirla automáticamente a sombras ni a la mezcla.

**Recomendación:** conservar candidata QA. Este recorrido valida descarga y reinstalación básica, no animación continua ni coste durante streaming. Antes de integración faltan recorrido continuo cerca del barro y revisión de atributos alternativos de normal retenidos por el control A/B. La prueba previa midió +0,89ms GPU en media diurna: el beneficio debe justificar ese coste, sin presentarlo como gratuito. No se acredita todavía el objetivo global.
