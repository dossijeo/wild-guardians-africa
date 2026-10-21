# Invalidación por salida efectiva en WASM

Variante QA `engine-selection`, derivada de `engine-events`. Mantiene registros persistentes y eventos de Engine, la misma esfera de culling, margen, LOD, orden y sombras. El backend sigue siendo Three.js/WebGL2.

`wr_select_checked` compara bit a bit los Float32 finales con el contenido previo del buffer mientras genera la salida. Incluye matrices con origen aplicado, visibilidad y cantidad final; no basta con comparar IDs porque una transformación o fade puede cambiar sin sustituir la instancia. La primera escritura siempre invalida. Una salida vacía sin cambios se codifica sin ambigüedad. No se asigna un segundo buffer ni se recorre la escena en JS para comparar.

Se conserva `wr_select` y la variante anterior para A/B. La comprobación añade lecturas/comparaciones en WASM y todavía genera la salida al cambiar cámara: no elimina por sí sola el coste de selección ni traslada el agrupador completo. Su utilidad se decide por el benchmark completo, no por el número de subidas aislado.

Pruebas: paridad con Three.js, movimiento de cámara sin cambio de salida, cambios de selección LOD, fade, transformación, origen y retiro. En modo efectivo se comprueba que la señal de subida corresponde al cambio real de salida. El conjunto de diez casos pasó después de compilar con Emscripten.

## Reproducción

```powershell
./tools/build-wild-renderer.ps1
$env:WR_OUT='docs/qa/wild-renderer/effective-selection-abab'
$env:WR_ORDER='engine-events,engine-selection,engine-events,engine-selection'
$env:WR_FIXED_RESIDENCY='1'
node tools/experiments/measure-wild-renderer.mjs
python tools/experiments/audit-wild-renderer.py docs/qa/wild-renderer/effective-selection-abab --effective-selection
```

Misma Sabana, semilla 712, baja, Intel UHD, 1280×720, cobertura C/viento 8, trayectoria por índice y 49 chunks residentes que el control ABCABC. Día/noche; 180 frames de calentamiento por ventana, 180 muestras GPU y 360 de cadencia separadas. Sin cambios en producción, simulación o ramas estables.

## Resultado A/B/A/B

1.440 muestras GPU y 2.880 frames de cadencia, sin errores GL, alteraciones del estado o creaciones de chunks durante las ventanas. Draws/triángulos/cámaras coinciden por frame en todos los bloques. Las dos parejas A/B de cada fase tienen imágenes exactas; entre repeticiones nocturnas difieren 7 píxeles con delta máximo 1, también dentro de A y dentro de B. Por ello la auditoría estricta global permanece negativa: no se relaja el criterio ni se elimina ninguna repetición.

| Medida | A, eventos | B, salida efectiva |
|---|---:|---:|
| Grupos subidos/frame | 47,99 | 11,36–11,40 |
| CPU agrupador día | 1,77–2,17 ms | 1,72–1,85 ms |
| CPU agrupador noche | 1,87–2,51 ms | 1,59–1,65 ms |
| GPU día | 12,56–14,90 ms | 12,09–12,70 ms |
| GPU noche | 14,18–18,72 ms | 12,77–13,52 ms |
| Intervalo día | 17,75–20,25 ms | 16,71–17,04 ms |
| Intervalo noche | 18,94–37,83 ms | 17,18–17,37 ms |

Rangos de medias de dos bloques, no intervalos de confianza. La reducción de subidas ronda el 76%. Cadencia y p95 mejoran en las cuatro parejas, pero CPU total/agrupador empeoran en la segunda pareja diurna. Hay fuerte variación del primer control nocturno; no se atribuye su magnitud a la optimización. La reducción de subidas no equivale a una medición de bytes transferidos o VRAM.

**Conservar como candidata experimental.** El cambio elimina invalidaciones GPU innecesarias sin perder el ahorro geométrico del culling. No demuestra todavía una aceleración uniforme ni resuelve la preparación restante en JavaScript. Antes de promoción: repetir con streaming normal y eventos de modificación reales, y medir el agrupador restante. No se habilita por defecto.

[Datos completos](effective-selection-abab/benchmarks.json), [auditoría](effective-selection-abab/summary.json), [día](effective-selection-abab/day-pair.webp), [noche](effective-selection-abab/night-pair.webp).

## Validación de eventos reales

Se ejecutó la variante `engine-selection` con la escena densa y tres comandos reales de plantación. Cada `CropPlaced` añadió una supresión, retiró un registro y conservó otros 172. Se verificó que ningún registro nativo retuviera el prop suprimido.

La prueba compara además las matrices/visibilidad anteriores y posteriores de cada grupo existente. En los dos primeros eventos cambió un buffer y aumentaron sus versiones de matrices y visibilidad para que Three.js lo suba. El tercer evento sustituyó un registro sin cambiar la salida visible: un evento lógico no obliga a cambiar el buffer de cámara. La prueba no hace una lectura de memoria GPU ni certifica píxeles posteriores al evento; verifica datos de salida e invalidación de atributos.

Los tiempos de esta prueba son diagnósticos de llamadas individuales, no un benchmark: las copias de comprobación se realizan fuera del trabajo normal del renderer. [Resultado verificable](effective-selection-mutations-uploads/engine-selection-mutations.json). La prueba inicial sin comprobación de versiones también se conserva en `effective-selection-mutations`.

Reproducir con `WR_ORDER=engine-selection`, `WR_DENSE=1`, `WR_MUTATE=1`, `WR_MUTATE_ONLY=1` y un `WR_OUT` nuevo. La validación con streaming normal y el traslado de la preparación restante siguen pendientes.
