# Ceniza volcánica: cámara y recarga de chunks

**Mantener como candidata QA.** Las muestras muestran la separación entre roca expuesta y depósitos suaves durante el recorrido y al regresar a la zona. No se promueve todavía: siguen pendientes el coste por fragmento y una validación temporal más amplia.

- [Vídeo diurno A/B](day.mp4)
- [Vídeo nocturno A/B](night.mp4)
- [Vista oblicua diurna](day-0017-pair.webp)
- [Antes/después de recargar la zona, candidata](combined-roundtrip-pair.webp)

En los vídeos: original a la izquierda, ceniza a la derecha. Son 36 capturas por variante y fase, codificadas a 12 fps durante 3 segundos; ffprobe verifica esos valores. Los pasos visuales fueron de 1/30 s: la reproducción está ralentizada y **no representa rendimiento medido**. La inspección del agente se hizo sobre fotogramas y pares de regreso, no reproducción continua del vídeo completo.

## Comparación controlada

Sabana no interviene en este estudio: campaña de Volcanes, semilla 712, calidad baja, 1280 × 720 por variante, día 150/noche 350. Cámara normal → oblicua → inversa. Simulación pausada y reloj del material congelado; el render automático se suspende durante captura. Cada frame se dibuja y lee síncronamente tras esperar los chunks.

144 capturas, 72 parejas auditadas. Cámara, objetivo, hora, opacidades de ocultación, llamadas de dibujo y triángulos coinciden A/B en cada posición. Todas las imágenes contienen escena, sin errores GL o de página registrados. Las diferencias corresponden a la candidata de suelo; no se añade geometría. La lectura de depósitos suaves se conserva en la vista oblicua revisada, pero no se afirma ausencia de artefactos entre todas las posiciones ni en cualquier distancia.

## Recorrido de streaming

Después de la secuencia nocturna se visita un cuadrado de cuatro posiciones con desplazamientos de 192 metros y se vuelve al inicio. Se conservan los modelos originales y las posiciones simuladas; solo se mueve la cámara. En cada parada se esperan chunks/horizonte, se dibujan 16 pasos visuales y se fija la ocultación para la comparación.

La cámara, objetivo, conjunto de 25 chunks y geometría enviada al volver coinciden con el inicio. El origen interno sí cambia: `(0,0)` → `(240,0)` → `(240,192)` → `(48,192)` → `(48,0)`. El auditor no exige igualdad de origen, porque el renderizador lo desplaza legítimamente; se registra para contrastar la estabilidad de las coordenadas mundiales del material.

El regreso no es RGB exacto: original 3.361 píxeles distintos, candidata 2.053, máximo 35 niveles RGB en ambos. En el par revisado de la candidata no se aprecia desplazamiento amplio de los depósitos. No se atribuye la diferencia residual a una causa sin diagnóstico adicional.

Contadores Three.js de la candidata: geometrías `184 → 89 → 93 → 95 → 87`, texturas `54 → 46 → 46 → 49 → 49`, programas `31 → 30 → 30 → 30 → 30`. El original tiene la misma serie de geometrías/programas y empieza con 56 texturas, terminando también en 49. No hay crecimiento monotónico ni error registrado en esta ida y vuelta. Estos contadores no miden bytes de VRAM; una única vuelta tampoco demuestra ausencia de fugas, ni sustituye pruebas de reapertura y ciclos repetidos.

[Auditoría](analysis.json) · [Capturas](captures.json) · [Recorrido original](base-roundtrip.json) · [Recorrido candidata](combined-roundtrip.json)

## Rendimiento y límites

No se ejecutó un benchmark adicional durante estas capturas. Sigue vigente el [piloto de rendimiento](../volcanic-ash-pilot/README.md): incremento agregado GPU diurno aproximado de 1 ms, con solapamiento entre bloques. No inferir rendimiento en movimiento a partir del vídeo codificado.

Faltan más distancias, pendientes, calidad media en movimiento, repetición de streaming y reducción del coste del ruido procedural. La candidata sigue limitada al material volcánico de QA; main y el comportamiento original permanecen intactos.

## Reproducción

```powershell
node tools/experiments/capture-volcanic-ash-motion.mjs
python tools/experiments/package-volcanic-ash-motion.py
```

Vite en 5190. Para cada fase, codificar los PNG de `base` y `combined` con ffmpeg, entradas a 12 fps, `hstack=inputs=2`, 36 frames, libx264, CRF 24, yuv420p. PNG y pares no seleccionados quedan locales; se publican vídeos, trazas y pares seleccionados.
