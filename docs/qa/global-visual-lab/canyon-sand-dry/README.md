# Arena seca: reflexión ambiental limitada al depósito

**Conservar como candidata visual QA, sin integrar.** Corrige el brillo rasante blanquecino localizado por las ablaciones. Mantiene mapa normal, albedo, iluminación directa, AO, sombras y recursos de la receta de arena.

[Cercana diurna](media-day-2-pair.webp) · [Normal diurna](overview/media-day-0-pair.webp) · [Normal nocturna](overview/media-night-0-pair.webp)

## Cambio

El material expone qaDrySandWeight=deposit*.9, inicializado a cero fuera de la arena. Multiplica biomeSpec por mix(1,(.02*.02)/(1−.98*.72),peso), reemplazando progresivamente el peso de rugosidad de arena por suavidad al cuadrado. .98 es la rugosidad de la receta de arena, no un ajuste global. Es una corrección artística acotada, no un BRDF integrado físicamente ni una medida de rugosidad real. El componente residual de grava conserva reflexión. En superficies con peso cero, factor exactamente1. La máscara de pendiente determina dónde puede contribuir arena, incluyendo superficies planas de roca: no garantiza una clasificación semántica de todas las paredes.

La corrección conserva la reflexión ambiental calculada y luego la atenúa; **no ahorra esa evaluación ni las lecturas de arena**. No añade recursos, geometría, sampler o pasada. No se afirma coste GPU idéntico sin medición.

## Evidencia

36 capturas /18 parejas:24 cercanas media/baja día/noche y12 de cámara normal/elevada/reversa en media. Seed712,1280×720, día150/noche350. Cámara/objetivo/hora/draws/triángulos iguales; sin errores. La elevada de este pase usa el desplazamiento corregido para evitar la meseta del primer plano.

Inspección de candidata cercana media diurna y pares normales medios día/noche: se atenúa el brillo claro en sombra cercana, conservando ondulaciones iluminadas; a cámara normal se mantiene la lectura de relieve y el cambio es moderado. No se declara aprobación artística individual de todas las imágenes. No hay prueba temporal ni recorrido de origen. La noche normal conserva detalle, aunque no es RGB idéntica.

El sobrecoste nocturno de la receta completa medido en canyon-sand-maps/performance sigue abierto. Esta corrección no lo resuelve. Siguiente puerta: validar movimiento y presupuesto completo frente a grava, sin comparar únicamente el pequeño cambio especular.

```powershell
node tools/experiments/capture-canyon-sand-dry.mjs
python tools/experiments/package-canyon-sand-dry.py
node tools/experiments/capture-canyon-sand-dry-overview.mjs
python tools/experiments/package-canyon-sand-dry-overview.py
```

Vite5190. drySand=false por defecto en helper. PNG fuente locales; pares, capturas.json y comparison.json publicados. Sin cambio del renderizador normal, main o simulación.
