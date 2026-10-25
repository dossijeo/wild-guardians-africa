# Fundido limitado a la superficie cercana

**Candidato visual, no integrar todavía.** Elimina la cuadrícula y reduce la acumulación de caras interiores del fundido convencional, pero cuesta más GPU/CPU y conserva una silueta translúcida. Falta revisar continuidad en vídeo, interacción con otras transparencias, profundidad y lifecycle. No resuelve aún la transición impostor/modelo3D.

## Implementación QA

Se separan únicamente las instancias parcialmente ocultas. Primero se dibuja su superficie en profundidad, sin color; después se mezcla su color con depthFunc=EqualDepth y alpha=nativeVisibility. Opaque y sombras mantienen la receta original. La profundidad auxiliar comparte geometría con su instancia de color, pero usa matriz/material propios; se retira junto a ella. No añade un render target, aunque sí draws adicionales.

La profundidad común selecciona la superficie parcial más cercana: no compone correctamente todas las capas de objetos translúcidos superpuestos. También puede interferir con agua/partículas u otros transparentes dibujados después. Son limitaciones relevantes, no validadas en estas imágenes secas.

El primer intento falló por doble aplicación de AfricanToon al material auxiliar opaco. Se corrigió excluyendo los auxiliares del registro automático, pues ya reutilizan los hooks/uniformes del material original. La serie final completa no registra errores de shader/GL.

## Capturas

Sabana baja,semilla712,1280×720, cuatro poses, día/noche; cobertura C viento8.16 capturas, ocho parejas con cámara/hora/hierba iguales. Izquierda original, derecha candidata:

- [Ocultación cercana](day-0009-pair.webp).
- [Vista oblicua](day-0017-pair.webp): menos acumulación de caras internas, pero la copa sigue siendo translúcida.
- [Noche](night-0017-pair.webp).

Vista normal exacta RGB,69 draws en ambos. Las otras poses añaden2–4 draws y3.867–15.495 triángulos netos por profundidad y omisión de completamente ocultos. No interpretar diferencias de píxeles como calidad. [Datos](captures.json), [comparación](comparison.json).

## Benchmark de cámara móvil

Intel UHD,Chrome headless,WebGL2,1280×720,baja. Ocho bloques ABBA en páginas nuevas, día/noche.30 calentamientos +120 muestras GPU y, por separado,30 calentamientos +180 frames sin consultas GPU.960 muestras válidas y1.440 frames de cadencia. Cámara y viento por índice, dt visual fijo1/30; se inicializa la ocultación con snap antes de cada segmento. Simulación pausada.

Auditoría final: cámaras iguales por índice, más de60 poses distintas, conteos repetibles entre bloques de cada variante, cobertura coincidente, sin errores registrados. Los conteos entre variantes difieren deliberadamente por los draws auxiliares; el auditor no exige igualdad entre ellas. No mide directamente número de fragmentos ni bytes transferidos.

| Medida (ms) | Dithering original | Superficie fundida |
| --- | ---: | ---: |
| GPU día | 14,83–15,75 | 15,90–17,86 |
| GPU noche | 15,76–16,07 | 17,23–18,38 |
| CPU render día | 5,04–5,44 | 5,50–6,13 |
| CPU render noche | 4,90–5,49 | 5,66–5,86 |
| Intervalo medio día | 19,87–20,95 | 21,20–24,07 |
| Intervalo medio noche | 19,85–22,43 | 22,78–22,81 |
| p95 intervalo día | 29,6–34,5 | 32,6–40,2 |
| p95 intervalo noche | 33,7–33,8 | 34,4–35,9 |

Rangos de medias de dos bloques, salvo p95 por bloque. No intervalos de confianza. No se controla temperatura/cargas externas. CPU incluye agrupación; no sumar ambas. El contador uploads de NativeAssetGroups **excluye las subidas de matrices auxiliares** y no demuestra tráfico GPU igual. Cadencia entre entradas al render, no presentación. Sin medición fiable de VRAM.

El [piloto con dt variable](performance/pilot-variable-dt/benchmarks.json) falló la repetibilidad de draws/triángulos: la ocultación dependía de tiempo real de cada frame. Se conserva excluido de las cifras finales. La corrección sincroniza el estado visual, no el reloj de las mediciones. [Serie final](performance/benchmarks.json), [resumen](performance/summary.json).

Estado comprobado: día/hora/elapsed/estructuras/trabajadores/plantas; no todo el mundo. Sin certificación de streaming ni seis biomas. Próximos pasos: revisar movimiento visible, simplificar el shader auxiliar de profundidad y probar conflictos con agua/efectos antes de considerar integración. Mantener independiente del culling experimental.

## Reproducción

Vite5190, secuencialmente:

```powershell
node tools/experiments/capture-obstruction-surface-blend.mjs
python tools/experiments/package-obstruction-surface-blend.py
node tools/experiments/measure-obstruction-surface-blend.mjs
python tools/experiments/audit-obstruction-surface-blend.py
```

No comprimir/capturar durante medición. Original por defecto; cambios solo mediante rutas QA.
