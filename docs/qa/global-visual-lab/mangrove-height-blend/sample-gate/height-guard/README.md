# Protección por altura: imagen y rendimiento de la receta conservada

La referencia es el sustrato completo aprobado visualmente, con omisión de iluminación sin peso. La candidata evita lecturas de color/normal de barro solo fuera de la transición, conservándolas cuando mossCover<1 o heightDifference<transitionWidth+2*fwidth(heightDifference). ARH, máscaras, alturas, color y receta de iluminación no cambian. Flags nuevos desactivados por defecto; solo QA.

## Imagen

12 capturas reales, seis parejas, baja1280×720, semilla712, día150/noche350, tres vistas cercanas. Cámara, objetivo, hora, llamadas y triángulos iguales, sin errores. [Día](day-pair.webp), [noche](night-pair.webp), [registros](captures.json), [paridad](parity.json), [coordenadas residuales](residual-locations.json).

Inspeccionada pareja diurna intermedia: conserva distribución y apariencia general a la escala presentada. No es RGB exacto: 8–25 píxeles distintos por imagen, máximos6–19. La protección anterior dejaba71–162; la inicial3101–7166. La reducción apoya investigar dependencias entre fragmentos, pero no identifica completamente la causa. No afirmar equivalencia temporal ni ausencia de artefactos por estos fotogramas estáticos.

## Benchmark directo

Intel UHD0x9A60 ANGLE D3D11, Chrome headless, WebGL2, baja1280×720. A/B/A/B, día/noche, páginas nuevas;180frames de calentamiento y240 muestras por bloque. Medidas GPU y CPU/cadencia en bloques separados. Cámara móvil determinista, simulación pausada, sin captura simultánea.1920muestras GPU válidas y1920frames de cadencia. Auditoría de estado, dispositivo, cámara y geometría coincidentes; sin errores, disjoint, consultas descartadas ni pendientes.

| Fase GPU ms | Referencia, dos bloques | Candidata, dos bloques | B−A por pareja |
|---|---|---|---|
| Día |13.771 /12.804|11.844 /12.717|−1.927 /−.087|
| Noche |14.402 /14.831|12.547 /14.645|−1.855 /−.186|

Las cuatro diferencias GPU favorecen la candidata, pero la magnitud varía mucho. No garantiza un ahorro estable de1ms: las segundas parejas son casi iguales. CPU render diurno4.698/4.212 frente4.169/4.887; nocturno4.555/4.130 frente4.333/5.485. La última candidata empeora CPU y cadencia (media23.959ms, p9576.7ms). No se controla carga externa ni frecuencia térmica; no atribuir ese empeoramiento a esta rama sin repetición. Dos medias no son intervalos de confianza.

Uploads assetGroups5.4/frame en todos los bloques, no tráfico GPU total. CPU excluye simulación; cadencia mide entradas al render, no presentación. No hay memoria GPU medida, streaming prolongado ni validación de calidad media. [Datos](performance/benchmarks.json), [resumen](performance/summary.json).

## Decisión

Conservar como candidata de optimización, sin reemplazar todavía la receta aprobada. La dirección visual permanece aprobada independientemente de este resultado. Próximos pasos: resolver/localizar los residuos y repetir rendimiento con inspección temporal antes de integración. Este ensayo no acredita que se haya compensado el coste total frente al musgo puro; no comparar medias de series distintas como un A/B.

```powershell
node tools/experiments/capture-mangrove-height-guard.mjs
python tools/experiments/audit-mangrove-sample-gate.py docs/qa/global-visual-lab/mangrove-height-blend/sample-gate/height-guard
node tools/experiments/measure-mangrove-height-guard.mjs
python tools/experiments/audit-mangrove-height-guard.py
```

Vite5190. PNG locales, pares lossless y registros publicados. Main, simulación, modelos y terreno autoritativo intactos. Objetivo de los seis biomas aún pendiente.
