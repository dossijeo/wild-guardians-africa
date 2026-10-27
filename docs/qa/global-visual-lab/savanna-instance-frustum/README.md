# Sabana: descarte conservador por instancia

Variante QA de NativeAssetGroups, sin modificar su implementación de producción. La ruta actual agrupa todos los objetos de los chunks que intersectan el frustum. El prototipo descarta además cada instancia cuya esfera transformada, ampliada2,5m, queda completamente fuera del frustum de cámara. Solo afecta a la pasada de color; conserva todos los shadow casters, modelos, LOD, densidad de cobertura y materiales.

La esfera procede de la geometría del LOD, se transforma con la misma matriz mundial que se empaqueta y admite escala no uniforme mediante Sphere.applyMatrix4. La matriz de cámara participa en el stamp para invalidar la selección al moverse. Esto provoca trabajo de selección y subidas durante movimiento: no considerar aprobado ese coste a partir de la cámara fija. El margen2,5m es conservador en estas vistas, no una cota certificada de toda animación futura.

## Capturas

Campaña Sabana, semilla712, calidad baja,1280×720. Tres cámaras, día150/noche350, cobertura C viento8/tiempo2. Seis pares con cámara/objetivo/hora y cobertura idénticos; sin errores registrados.

| Vista | Triángulos A → B | Draw calls A → B | Píxeles distintos día/noche |
| --- | ---: | ---: | ---: |
| Normal | 1.274.920 → 498.983 | 69 → 59 | 0 / 0 |
| Oblicua | 1.339.074 → 571.579 | 76 → 67 | 0 / 0 |
| Inversa | 1.168.462 → 483.762 | 61 → 55 | 84 / 186 |

Reducción normal de60,9% de triángulos enviados, **no de geometría visible ni de calidad de los modelos**. No equivale a60,9% de ahorro GPU. Cuatro capturas exactas; la causa de los pequeños residuos de la vista inversa sigue pendiente y no se declara paridad universal.

[Normal día](day-0000-pair.webp), [normal noche](night-0000-pair.webp), [inversa día](day-0002-pair.webp), [inversa noche](night-0002-pair.webp). Izquierda A, derecha B. [Comparación numérica](comparison.json).

## Benchmark estacionario

Intel UHD, Chrome headless,1280×720. Ocho bloques ABBA en páginas nuevas, día/noche. Cada condición:30 frames de calentamiento +120 consultas GPU y, por separado,30 de calentamiento +180 frames de cadencia sin consultas GPU.960 muestras GPU válidas,1.440 frames de cadencia; sin errores registrados. Cámara/objetivo/hora y cobertura coinciden; contadores estables entre repeticiones de cada variante. Los valores son rangos de las medias de los dos bloques, no intervalos de confianza.

| Medida (ms) | Original A | Candidata B |
| --- | ---: | ---: |
| GPU día | 14,59–14,81 | 9,07–10,30 |
| GPU noche | 14,38–20,89 | 9,47–10,04 |
| CPU render día | 4,11–4,34 | 3,82–4,38 |
| CPU render noche | 3,70–5,26 | 3,92–3,94 |
| Intervalo medio día | 17,00–19,57 | 16,63–16,63 |
| Intervalo medio noche | 16,97–32,52 | 16,63–16,63 |
| p95 intervalo día | 18,4–26,9 | 17,1–17,1 |
| p95 intervalo noche | 22,6–49,6 | 17,2–17,3 |

El render completo incluye el triángulo del cielo:70→60 draws y1.274.921→498.984 triángulos. La captura informa el último render de escena y por eso cuenta uno menos. No confundir esta diferencia de ámbito con geometría desaparecida.

**Conservar como candidata prometedora para validar movimiento.** Ambos bloques B son inferiores a ambos A en tiempo GPU diurno/nocturno, pero las cargas externas y las frecuencias no están controladas; no extrapolar el porcentaje a todo el juego. CPU es solo world.render; cadencia es intervalo de entrada, no presentación. Memoria física no medida. La comprobación de estado cubre día/hora/elapsed/estructuras/trabajadores/plantas, no todo el estado.

[Datos completos](performance/benchmarks.json), [resumen](performance/summary.json). Antes de integrar: localizar residuos, medir selección y cadencia durante movimiento, comprobar límites de frustum, carga/descarga y seis biomas. La calidad global de los mockups no queda acreditada por esta optimización.

La [prueba posterior en movimiento](motion/README.md) detecta mayor CPU y unas48 subidas de grupos por frame frente a11 originales; p95 peor pese a menor GPU. No promover esta versión. Separar invalidación de cámara de subida efectiva cuando la selección no cambia.70 de72 parejas del recorrido son exactas; dos residuos diurnos documentados.

## Reproducción

Vite5190. Ejecutar capturas/compresión separadas del benchmark:

```powershell
node tools/experiments/capture-savanna-instance-frustum.mjs
python tools/experiments/package-savanna-instance-frustum.py
node tools/experiments/measure-savanna-instance-frustum.mjs
python tools/experiments/audit-savanna-instance-frustum.py
```
