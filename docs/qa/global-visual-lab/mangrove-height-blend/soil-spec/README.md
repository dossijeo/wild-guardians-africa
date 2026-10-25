# Ablación de reflexión ambiental en el sustrato

Prueba causal limitada: en Manglares, biomeSpec se multiplica por materialCover410. Con cobertura de musgo1 se conserva; en barro puro0 se anula; en la transición se atenúa. Mantiene reflexión directa del sol, mapas, rugosidad, AO, color, sombras y reparto por altura. No se aplica la variante de conversión de color anterior. La receta de iluminación separada del interior de parches no se altera.

[Oblicua diurna](manglares-media-day-2-pair.webp) · [Oblicua nocturna](manglares-media-night-2-pair.webp). Izquierda control, derecha ablación. Se inspeccionaron las candidatas completas de estas dos vistas.

La reducción oscurece el barro y reduce su brillo, pero permanece el azul nocturno y la diferencia respecto a los parches. **No adoptar esta supresión como corrección general.** La reflexión ambiental contribuye, pero su atenuación no resuelve por sí sola la discrepancia. No concluir que el color azul proviene exclusivamente de especular ni eliminar reflejos de todos los materiales. La prueba no aísla por separado iluminación ambiental difusa, luz directa y respuesta toon de los parches.

## Evidencia

24 capturas/12 parejas, media/baja, día150/noche350, tres vistas cercanas a transición, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos iguales por pareja; sin errores registrados. Conversiones WebP individuales lossless verificadas contra PNG. [Registros](captures.json) · [Comparación](comparison.json). Pares reducidos publicados.

El shader sigue calculando groundReflection y biomeSpec antes de la multiplicación: no es un ensayo de ahorro de muestras ni tiempo GPU. Sin benchmark nuevo, sin movimiento o validación de streaming. No se promociona a producción. Conservar como evidencia de diagnóstico para evitar atribuir a especular todo el problema cromático.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-soil-spec.mjs
python tools/experiments/package-mangrove-soil-spec.py
```

La interceptación modifica únicamente la ruta QA de iluminación de Manglares y usa la transición por altura calibrada en ambos lados. Sin cambios de geometría, motor, simulación o main.
