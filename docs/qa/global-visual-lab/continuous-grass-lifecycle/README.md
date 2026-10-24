# Cobertura continua: cierre y reapertura seguros

Corregido en los pilotos conservados de Sabana y Gran Río. `dispose()` liberaba las mallas, pero dejaba `world.qaContinuousGrass` y `world.groundDetails` apuntando al objeto liberado. Una nueva llamada al helper encontraba esa referencia y reutilizaba el estado anterior. Además restauraba incondicionalmente el callback de render, eliminando cualquier wrapper instalado posteriormente.

El [registro previo](before-fix.json) reproduce el fallo: la referencia permanece y la capa continúa marcada como habilitada después del cierre. El comprobador terminó con `Teardown invariants failed` antes de aplicar la corrección.

## Cambio

El cierre compartido es idempotente, deshabilita la capa, libera sus geometrías/materiales y eventos, vacía cachés y elimina la referencia solo cuando pertenece a esa instancia. Restaura el callback únicamente si sigue siendo el suyo; un callback externo se conserva. Si ese wrapper vuelve a llamar al hook ya cerrado, este ejecuta su predecesor y omite la cobertura liberada.

`groundDetails` queda como capa visual vacía compatible con el mundo hasta la siguiente instalación. **No reconstruye las antiguas matas decorativas**: el piloto las reemplazaba y liberaba al entrar. Esta corrección no convierte el cierre en una restauración completa del renderer previo. Las texturas del terreno pertenecen al mundo y no se destruyen. No se cambian shaders de hierba, distribución, alturas, LOD ni fuerza de viento 8×. Las copias de experimentos descartados o candidatos de LOD no se modifican ni se promueven.

## Evidencia en el juego

`node tools/experiments/check-continuous-grass-lifecycle.mjs`, con Vite en 5190. Campaña real, semilla 712, cultura Mapungubwe; Sabana/Gran Río, media/baja, cámara normal fija. Tres instalaciones C por combinación, capturas día 150 y noche 350, fase de viento 2,5 s. Dos llamadas consecutivas a `dispose()` por ciclo. Después, otra instalación comprueba que un wrapper externo sobreviva al cierre y pueda renderizar sin errores.

24 capturas; 16 comparaciones entre la primera instalación y las posteriores. Máximo seis píxeles distintos, amplitud máxima un nivel RGB/255: no identidad binaria universal. WebP lossless verificados frente a PNG. Cero errores HTTP, consola o JavaScript registrados; `getError()` cero tras los cierres y la prueba del wrapper. [Comparaciones](comparison.json).

| Bioma / calidad | Triángulos de cobertura en cada instalación | Geometrías activas / cerradas | Texturas en ambos estados |
|---|---:|---:|---:|
| Sabana / media | 212704 | 157 / 155 | 59 |
| Sabana / baja | 36960 | 139 / 138 | 56 |
| Gran Río / media | 266316 | 176 / 174 | 52 |
| Gran Río / baja | 38936 | 157 / 156 | 50 |

Estos son contadores de recursos del renderer, no bytes de VRAM ni una prueba de ausencia de cualquier fuga de heap. Los recursos vuelven al mismo valor en los tres ciclos de cada combinación. Un wrapper externo puede conservar referencias JavaScript al callback antiguo; esta prueba verifica su funcionamiento y la liberación de recursos GPU explícita, no recolección total de memoria.

- Sabana: [primera instalación](sabana-media-0-day.webp) / [tercera instalación](sabana-media-2-day.webp).
- Gran Río: [primera instalación nocturna](gran-rio-media-0-night.webp) / [tercera instalación nocturna](gran-rio-media-2-night.webp).
- Registros: [Sabana media](sabana-media.json), [Sabana baja](sabana-baja.json), [Río media](gran-rio-media.json), [Río baja](gran-rio-baja.json).

No se repiten benchmarks GPU/CPU ni se afirma ahorro temporal. No se ha validado aquí streaming durante el intervalo cerrado, destrucción completa del mundo, instalación concurrente o calidades superiores. Este pase resuelve una condición previa a ampliar el uso del piloto, no aprueba la integración ni demuestra la calidad artística global. No se modifica main ni el renderer por defecto.
