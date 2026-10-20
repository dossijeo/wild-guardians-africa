# Sabana: aislar el coste de la cobertura

**Conservar la cobertura y no reducir su densidad a partir del benchmark anterior.** Quitarla no elimina los picos ni demuestra una mejora consistente. La prueba cambia la siguiente acción: localizar el trabajo restante del render antes de sacrificar el volumen aprobado.

## Evidencia

Intel UHD, Chrome headless, WebGL2, calidad baja, 1280×720, semilla712. Campaña real pausada, cámara normal idéntica, día150 y noche350. Cuatro páginas nuevas en orden A/B/B/A; A instala el sistema pero desactiva el dibujo y la selección, B activa cobertura C con viento8. Ambas sustituyen el sistema anterior de groundDetails y reservan los mismos buffers: A no es el juego original ni mide memoria ahorrada al desinstalar la cobertura.

Cada condición tiene30 frames de calentamiento y120 consultas GPU, seguidos de30 de calentamiento y180 frames de cadencia sin consultas GPU. Ocho bloques,960 muestras GPU válidas,1.440 frames de cadencia. Auditoría sin errores ni cambios del subconjunto de estado registrado. Misma cámara/objetivo/hora; única diferencia de draws/triángulos: la cobertura. Capturas ejecutadas después, sin interferir con mediciones.

| Medida | Sin cobertura | Cobertura C |
| --- | ---: | ---: |
| Draw calls del render completo | 69 | 70 |
| Triángulos enviados | 1.235.913 | 1.274.921 |
| GPU día, medias de bloques (ms) | 16,32 / 18,11 | 16,36 / 16,67 |
| GPU noche, medias de bloques (ms) | 13,90 / 19,80 | 14,13 / 18,47 |
| CPU render día, medias (ms) | 7,18 / 4,74 | 7,85 / 3,90 |
| CPU render noche, medias (ms) | 6,99 / 4,24 | 7,08 / 4,53 |
| Intervalo día, medias (ms) | 16,63 / 24,91 | 16,63 / 18,10 |
| Intervalo noche, medias (ms) | 16,68 / 23,18 | 16,63 / 23,44 |

La cobertura aporta4.876 módulos ligeros,39.008 hojas/triángulos y un draw, sin sombras individuales. Es aproximadamente3,1% de los triángulos enviados con cobertura; esa proporción **no equivale a porcentaje de tiempo GPU**. Los1.206.456 bytes de atributos/índices reservados coinciden A/B y no representan VRAM total.

Los tiempos se solapan y presentan deriva considerable. No concluir que añadir hierba acelera el juego, que cuesta cero, ni que todo el coste restante sea geometría. La ruta sin cobertura también excede16,7ms y su p95 alcanza37,3ms de día y32,8ms de noche. La reducción de densidad no queda justificada por estos datos.

## Lectura visual

Seis parejas, tres cámaras, día/noche. Izquierda sin cobertura; derecha C. Cámara, hora y diferencia geométrica auditadas. Doce WebP individuales sin pérdida, verificados contra los PNG originales.

- [Vista normal diurna](captures/day-0000-pair.webp): la capa corta aporta volumen continuo y separación de fibras en las regiones cubiertas. Desactivarla recupera la alfombra plana; no aceptar esa pérdida como optimización.
- [Vista normal nocturna](captures/night-0000-pair.webp): persiste la separación de fibras; quedan diferencias cromáticas con el suelo y una transición de distancia visible.
- [Vista oblicua diurna](captures/day-0001-pair.webp) y [nocturna](captures/night-0001-pair.webp).

Esta prueba no mejora por sí misma el arte ni acredita el objetivo global. Conserva la receta vigente y evita dirigir la optimización al componente equivocado. Siguiente diagnóstico: atribución de draw calls/triángulos y coste por grupos de materiales, manteniendo inicialmente geometría y apariencia.

## Límites y reproducción

CPU solo world.render; intervalo entre llamadas, no presentación. Cámara fija, sin prueba de streaming ni selección en movimiento. La selección no se ejecuta en A y sus cachés permanecen vacías: no comparar sus tiempos acumulados de preparación con B como ahorro por frame. Las dos variantes reservan buffers, y los contadores no miden memoria física. Temperatura, frecuencias y cargas externas no se controlan. El estado comprobado comprende día/hora/elapsed/estructuras/trabajadores/plantas, no todo el mundo.

[Datos](benchmarks.json), [resumen](summary.json), [poses y contadores de captura](captures/captures.json).

Con Vite del laboratorio en5190, ejecutar secuencialmente:

```powershell
node tools/experiments/measure-savanna-coverage-cost.mjs
python tools/experiments/audit-savanna-coverage-cost.py
node tools/experiments/capture-savanna-coverage-cost.mjs
python tools/experiments/package-savanna-coverage-cost.py
```

No ejecutar capturas/compresión mientras se mide. Rama experimental solamente; sin cambios de producción, simulación ni main.
