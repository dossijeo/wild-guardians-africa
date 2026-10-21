# Borde de barro limitado por tamaño

Candidata exclusivamente QA. Las parejas elevada diurna y normal nocturna inspeccionadas conservan regiones reconocibles de barro y rompen parte del borde regular sin la fragmentación excesiva del inset fijo. Es una mejora localizada de transición: la repetición y el aspecto acolchado del musgo siguen pendientes. No constituye aprobación del bioma ni del renderer global.

[Elevada diurna](manglares-media-day-1-pair.webp) · [Normal nocturna](manglares-media-night-0-pair.webp). Izquierda original; derecha candidata. [Capturas](captures.json) · [Comprobación](comparison.json).

## Implementación

Se reutilizan los contornos visuales completos de mudOutlines. Al buscar la distancia al borde, se toma como radio aproximado la mitad del menor lado de la caja del contorno más cercano. Se almacena como un atributo float por vértice (4 bytes de datos adicionales por vértice, sin estimar VRAM real), reutilizando la caché de posiciones. No añade consultas a navegación ni trabajo JavaScript por fotograma.

El avance máximo es min(1.4, radio × 0.30), modulado por el mismo ruido espacial del ensayo anterior. Se atenúa entre distancias interiores de 0.28 y 0.58 veces el radio. El difuminado también se limita según tamaño. No es un cálculo exacto del círculo inscrito ni garantiza núcleos en formas arbitrariamente estrechas. El generador actual rechaza contornos que cruzan límites del chunk y conserva los contornos completos; no se está estimando tamaño desde polígonos recortados por la teselación.

No se modifican posiciones, siluetas de modelos, ocupación, simulación ni geometría del suelo. El shader sigue mezclando materiales opacos. Un nuevo varying y cálculo de ruido añaden coste aunque no haya nuevas lecturas de textura, draw calls o triángulos respecto a la mezcla QA anterior. El programa usa una clave específica para evitar compartir shaders incompatibles.

## Validación visual

24 capturas reales, 12 parejas: media/baja, normal/elevada/inversa, día150/noche350, seed712, 1280×720. Verificados cámara, objetivo, hora, draw calls y triángulos iguales por pareja, sin errores registrados. Las 24 imágenes WebP individuales sin pérdida se verificaron contra PNG; se publican pares reducidos para revisión. No se cuantifica superficie física conservada a partir de diferencias RGB.

Pendientes: validación temporal visual, streaming/lifecycle y un coste reproducible. El comportamiento predeterminado permanece intacto.

## Reproducción

Con Vite5190:

```powershell
node tools/experiments/capture-mangrove-mud-sized-inset.mjs
python tools/experiments/package-mangrove-mud-sized-inset.py
node tools/experiments/measure-mangrove-mud-sized-inset.mjs
python tools/experiments/audit-mangrove-mud-sized-inset.py
```

## Rendimiento: inconcluso, no aprobar integración

Intel UHD 0x9A60 / ANGLE D3D11, calidad baja, 1280×720. ABAB por fase, 180 fotogramas de calentamiento y 240 muestras por bloque. 1.920 muestras GPU y 1.920 fotogramas de cadencia en ocho bloques. La auditoría verifica todas las consultas resueltas sin eventos disjoint, descartes o errores; cámara, draw calls y triángulos coinciden por índice. [Datos completos](performance/benchmarks.json) · [Resumen](performance/summary.json).

| Fase | GPU original, repeticiones (ms) | GPU candidata (ms) | Diferencias B−A (ms) |
|---|---|---|---|
| Día | 11.248 / 9.716 | 10.736 / 9.798 | −0.512 / +0.082 |
| Noche | 12.604 / 10.020 | 11.585 / 13.017 | −1.019 / +2.997 |

CPU de render diurna: original 5.205/4.756 ms, candidata 4.945/5.453 ms. Nocturna: original 4.811/4.627 ms, candidata 4.918/6.952 ms. El p95 de intervalos nocturnos alcanza 106.3 ms en el último bloque candidato, frente a 68.9/53.3 ms de los controles. No se ha aislado la causa de esa inestabilidad; no atribuirla exclusivamente al shader ni excluir el bloque desfavorable. Las subidas de buffers medias coinciden: 5.4 por fotograma.

La deriva y los cambios de signo impiden presentar ahorro o sobrecoste estable. Las mediciones CPU excluyen simulación y los intervalos son entradas al render, no presentación en pantalla. No se midieron VRAM real ni construcción/streaming de atributos. Mantener solo como candidata QA visual, no como mejora aprobada. Su mérito es conservar mejor los parches que el inset fijo, no resolver el objetivo global de Manglares.

## Comprobación posterior de recarga

[36 capturas y lifecycle](streaming/README.md): 18 parejas con geometría/cámara coincidente; atributos presentes en chunks nuevos, referencias activas liberadas al cerrar el mundo. Retornos nocturnos exactos, residuo diurno pequeño sin causa aislada. Solo valida el recorrido acotado; la recomendación QA y la limitación de rendimiento permanecen.
