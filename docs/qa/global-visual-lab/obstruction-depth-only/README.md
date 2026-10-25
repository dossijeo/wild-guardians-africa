# Fundido: profundidad sin iluminación

**Conservar como base del prototipo QA**, sin activar globalmente. Reutilizar standardDepthMaterial reduce el coste GPU diurno en este ensayo y mantiene las ocho comparativas exactas. La noche y los picos de cadencia presentan solapamiento: no se acredita una aceleración general ni se resuelven las limitaciones visuales/compositivas del fundido.

## Cambio

A es el fundido de superficie cercana con material de color completo en la pasada auxiliar sin escritura de color. B usa un clon privado del material estándar de profundidad del juego, conserva sus recortes, mapas alfa, displacement y soporte de instancing, y elimina únicamente el descarte Bayer de ocultación. Los materiales no compatibles hacen fallar el ensayo; no existe fallback silencioso que falsee el resultado. El material auxiliar sigue excluido del registro AfricanToon para evitar aplicar iluminación dos veces.

La selección de instancias, matrices, material de color, EqualDepth y orden de pasadas se mantienen. Los contadores GPU son iguales por frame entre ambas variantes en el benchmark. No se compara contra main ni contra dithering original.

## Paridad visual

Sabana baja,semilla712,1280×720, cuatro poses día/noche. Ocho parejas RGB exactas; misma cámara/hora/hierba y geometría. Se fija la ocultación en su valor deseado antes de cada captura, para comparar materiales en el mismo estado. Esto no prueba continuidad temporal.

[Cercana diurna](day-0009-pair.webp), [oblicua](day-0017-pair.webp), [oblicua nocturna](night-0017-pair.webp). Izquierda material completo, derecha profundidad estándar. [Datos](captures.json), [comparación](comparison.json).

El [piloto sin sincronizar opacidad](pilot-unsnapped/comparison.json) tenía seis pares exactos y residuos pequeños en las vistas inversas. Se conserva separado. Con la inicialización explícita esos residuos no aparecen; esto no demuestra retrospectivamente la causa de todas las diferencias de ensayos anteriores.

## Rendimiento

Intel UHD,Chrome headless,WebGL2,1280×720,baja. Ocho bloques ABBA, día/noche;30 calentamientos +120 muestras GPU y por separado30 calentamientos +180 frames sin consultas GPU.960 muestras GPU válidas,1.440 frames de cadencia. Cámara por índice, paso visual1/30, ocultación inicial sincronizada, simulación pausada. No captura ni compresión concurrente.

Auditoría: cámaras y draw calls/triángulos iguales por índice entre variantes y repetibles entre bloques; hierba coincidente y sin errores registrados. El snapshot comprueba día/hora/elapsed/estructuras/trabajadores/plantas, no todo el estado.

| Medida (ms) | Profundidad con material completo | Profundidad estándar |
| --- | ---: | ---: |
| GPU día | 15,83–16,08 | 14,70–15,17 |
| GPU noche | 15,83–17,36 | 15,55–15,91 |
| CPU render día | 5,01–5,16 | 4,86–5,20 |
| CPU render noche | 4,82–4,98 | 5,04–5,05 |
| Intervalo medio día | 20,06–20,31 | 19,40–19,49 |
| Intervalo medio noche | 19,90–20,37 | 19,88–21,08 |
| p95 intervalo día | 28,7–33,2 | 30,4–32,2 |
| p95 intervalo noche | 30,2–32,6 | 28,5–33,1 |

Rangos de medias de dos bloques, excepto p95 por bloque. No intervalos de confianza. CPU incluye agrupación; no sumar ambos valores. No controlar cargas externas/frecuencias limita la atribución causal. Intervalo entre llamadas, no presentación. Sin medición fiable de VRAM; los contadores de uploads del agrupador excluyen auxiliares. [Datos completos](performance/benchmarks.json), [resumen](performance/summary.json).

## Pendiente

Vídeo sincronizado del fundido para valorar la silueta translúcida y los saltos. Agua, partículas, solapamiento entre objetos parciales, profundidad secundaria, streaming/dispose y seis biomas siguen sin validar. La profundidad compartida selecciona la superficie parcial más cercana, no compone todas las capas transparentes. Impostores permanecen desactivados: su transición requiere otra prueba. Mantener original por defecto.

Reproducir con Vite5190, secuencialmente:

```powershell
node tools/experiments/capture-obstruction-depth-only.mjs
python tools/experiments/package-obstruction-depth-only.py
node tools/experiments/measure-obstruction-depth-only.mjs
python tools/experiments/audit-obstruction-depth-only.py
```
