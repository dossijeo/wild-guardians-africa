# Arena seca: cadencia de campaña real

**Decisión: avanzar a integración experimental opcional, sin activarla por defecto.** Las comparativas visuales anteriores y esta serie no reproducen una penalización importante consistente. No se afirma una aceleración ni se certifica el presupuesto GPU de +0,5 ms: esta prueba mide cadencia y CPU, no GPU. No repetir esta misma serie hasta obtener una cifra favorable.

32 bloques ABBA BAAB, 60 fotogramas de calentamiento y 240 medidos por bloque: **7.680 fotogramas nativos**. Intel UHD, Chrome, WebGL2, 1280×720 DPR1, semilla712, Desierto/Mapungubwe, hora150/350, media/baja. Campaña inicial pausada, cámara en recorrido corto determinista dentro de la región residente. El backend y la receta global-lighting son comunes; A es suelo original, B es normal CC0 con contorno geométrico y atenuación especular de arena seca.

## Resultado

Medias en milisegundos; CPU incluye el trabajo normal de la aplicación más instrumentación QA. No sumar CPU e intervalo RAF.

| Calidad / fase | Intervalo A | Intervalo B | CPU app A | CPU app B |
| --- | ---: | ---: | ---: | ---: |
| media / day | 33.742 | 31.611 | 4.261 | 4.295 |
| media / night | 35.682 | 35.457 | 3.907 | 4.010 |
| baja / day | 32.287 | 30.451 | 4.003 | 4.027 |
| baja / night | 26.952 | 25.705 | 3.277 | 3.254 |

La dispersión es grande: en media diurna el control oscila entre 28,129 y 41,433 ms por bloque. Las medias menores de B no prueban que añadir relieve acelere el juego. No se controló la carga global del escritorio, ni temperatura/frecuencia; no se atribuye la variación a un proceso concreto. Se conserva cada repetición, incluidos los bloques lentos.

## Auditoría y capturas

El analizador exige por índice de frame la misma cámara, objetivo, draw calls y triángulos para las ocho repeticiones de cada condición. Pasa en las cuatro condiciones. Estado completo invariable durante medición, materiales y chunks residentes estables, una llamada nativa a render por frame, página visible y ningún error HTTP/JS/GL de consola. No se consulta getError ni temporizadores GPU por fotograma. Las capturas y readbacks se hacen fuera de las ventanas medidas.

| Condición | Original | Candidata |
| --- | --- | --- |
| media / day | [A](media-day-base.webp) | [B](media-day-candidate.webp) |
| media / night | [A](media-night-base.webp) | [B](media-night-candidate.webp) |
| baja / day | [A](baja-day-base.webp) | [B](baja-day-candidate.webp) |
| baja / night | [A](baja-night-base.webp) | [B](baja-night-candidate.webp) |

Ocho WebP RGB sin pérdida, verificados contra los PNG. La revisión visual de los controles diurnos y de las candidatas nocturnas confirma relieve perceptible, conservación de edificios y ausencia del área lejana contaminada del piloto. No implica que se haya revisado visualmente cada fotograma de esta serie; la evaluación de movimiento está en ../motion.

[Resumen por bloque](summary.json), [datos crudos](results.json), [sesgos y pilotos excluidos](../campaign-settled/README.md). Los cambios por transición de hora se registran en warmupStateChanges, antes de establecer el estado de referencia; ninguno ocurre dentro de las ventanas medidas.

## Límites y siguiente paso

No mide campaña avanzada, simulación activa, generación de chunks en desplazamientos largos, VRAM ni fugas prolongadas. Los contadores de memoria son objetos Three, no bytes. La distancia reducida permite aislar render/animación y no acredita streaming. El tiempo incluye el observador QA; no representa FPS garantizados de producción. La revisión anterior aporta GPU y recorrido visual, con sus propias limitaciones.

La siguiente etapa debe trasladar la misma receta a una opción explícita del laboratorio, cargar la normal mediante el propietario BiomeGround y validar paridad con el helper, streaming y liberación. Conservar el original por defecto; no integrar aún automáticamente en global-lighting ni main. Esto permite revisar el conjunto sin depender de parches de navegador. La calidad global de seis biomas sigue abierta.

## Reproducción

Vite en5190, desde este worktree, sin otro benchmark GPU deliberado:

```powershell
$env:WG_SAND_OUTPUT='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/campaign-final'
node tools/experiments/benchmark-desert-sand-campaign.mjs
python tools/experiments/summarize-desert-sand-campaign.py
```

No definir WG_COVER_QUALITY, WG_SAND_PHASES o WG_SAND_ORDER para la serie completa. El empaquetado requiere Pillow y verifica todos los bloques antes de producir el resumen.
