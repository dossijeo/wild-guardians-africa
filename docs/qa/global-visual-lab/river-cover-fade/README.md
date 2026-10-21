# Gran Río: descarte de transición geométrica más larga

No adoptar la caída de altura de 24 m como solución al borde de cobertura. Suaviza parcialmente la delimitación, pero aplana una franja amplia y reduce el volumen colectivo visible. Se conserva la transición anterior de 12 m. El siguiente intento debe atender a la diferencia de respuesta entre suelo y cubierta sin sacrificar esta altura a media distancia.

[Comparación diurna media](gran-rio-media-day-pair.webp) · [Nocturna media](gran-rio-media-night-pair.webp) · [Diurna baja](gran-rio-baja-day-pair.webp) · [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: 12 m. Derecha: 24 m. Ambas conservan desgaste suavizado y paleta candidata del estudio anterior. No es una comparación contra main. Solo cambia una constante de smoothstep del vertex shader; el alcance, selección, geometría, iluminación y viento son iguales.

## Evidencia y límites

24 capturas reales, 12 parejas: Gran Río, semilla 712, 1280×720, calidad baja/media, día 150/noche 350, tres poses normal/oblicua/inversa. Cámara, objetivo, hora, llamadas, triángulos, instancias cercanas/lejanas y buffers coinciden por pareja. Sin errores GL o de página registrados; overflow cero. Se revisaron visualmente la vista normal baja diurna y las parejas normales media diurna/nocturna. No se realizó revisión exhaustiva de movimiento.

En la vista normal diurna, baja: 62 llamadas, 504.136 triángulos de escena, 0/5.123 instancias cercanas/lejanas. Media: 66 llamadas, 869.817 triángulos, 4.147/5.187 instancias. Buffers de cobertura: 1.206.456 bytes en ambos perfiles. Son contadores y bytes de buffers, no memoria GPU total. La reducción de altura puede cambiar la rasterización aunque coincidan los triángulos enviados.

No se ejecutó benchmark temporal: la candidata no supera la primera evaluación artística. No atribuir ahorro GPU ni ausencia de regresión a la igualdad de contadores. La ejecución modifica solo la respuesta QA interceptada; comportamiento predeterminado intacto.

[Registros](captures.json) · [Auditoría de parejas](comparison.json)

## Reproducción

Con Vite en 5190:

```powershell
node tools/experiments/capture-river-cover-fade.mjs
python tools/experiments/package-river-cover-fade.py
```

PNG originales locales; se publican cuatro comparaciones, registros y herramientas. El objetivo global de seis biomas sigue sin acreditarse.
