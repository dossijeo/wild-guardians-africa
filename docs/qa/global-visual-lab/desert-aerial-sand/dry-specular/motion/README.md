# Arena seca en movimiento alrededor del poblado

Cuatro comparativas reales: [media día](media-day-comparison.mp4), [media noche](media-night-comparison.mp4), [baja día](baja-day-comparison.mp4), [baja noche](baja-night-comparison.mp4). Izquierda: normal-only anterior. Derecha: normal-only con banda especular atenuada por rugosidad. No comparar estos vídeos como original plano frente a relieve: ambas partes ya contienen la arena irregular.

Cada lado procede de un canvas WebGL 1280×720; vídeos 2560×720, 121 cuadros a 30 fps, 4,033 s, verificados con ffprobe. Fotogramas deterministas codificados offline, sin interpolación ni imágenes generadas. **No prueban ejecución en tiempo real a 30 FPS.**

Campaña Desierto semilla 712, Mapungubwe, día 150/noche 350. Se conserva el objetivo inicial del poblado y se mueve la cámara desde offset [22,16,18] a [-18,10,22] y de vuelta con smoothstep, limitando su altura sobre el terreno. Se pausa la simulación, fija el reloj visual y espera a chunks/horizonte/actores. La caché LOD QA se reinicia al inicio de cada toma.

## Resultado

968 imágenes fuente, **484 parejas A/B con cámara, objetivo, hora, llamadas y triángulos iguales**. Cero errores HTTP/JavaScript/consola registrados y GL cero. [Metadatos](captures.json), [auditoría y vídeos](comparison.json).

Hay 296 parejas de ida/vuelta con pose y geometría iguales: 290 exactas; seis de baja diurna con hasta tres píxeles y un nivel RGB de diferencia. Los otros retornos tienen historial LOD distinto y se excluyen de la comparación de material, sin ocultarlos en los datos. No se atribuye a las normales cualquier cambio que provenga del LOD.

Las vistas iniciales y la intermedia diurna inspeccionadas mantienen las ondas y la calidez sin la franja brillante original. La corrección no suprime globalmente el relieve ni cambia edificios. La auditoría de retorno respalda reproducibilidad, pero no demuestra ausencia universal de aliasing entre poses distintas. Se entregan los clips para revisión temporal; no se afirma haber evaluado perceptualmente cada cuadro ni probado todos los campos de visión.

Conservar la candidata y consultar la [medición de coste](../performance/README.md) antes de promoverla. Este pase no añade geometría, sombras individuales ni cambios de simulación. La dirección global de seis biomas continúa pendiente.

## Reproducción

Vite del worktree en 5190:

```powershell
node tools/experiments/video-desert-sand-dry-specular.mjs
python tools/experiments/package-desert-sand-dry-specular-motion.py
```

Requiere Chrome/Playwright, Pillow/NumPy y FFmpeg/ffprobe en C:/ffmpeg/bin. `WG_COVER_QUALITY`, `WG_SAND_PHASES` y `WG_SAND_APPEND=1` permiten recapturas identificadas. Los 40 cuadros clave WebP lossless se verifican contra sus PNG; los PNG de trabajo se regeneran y no se añaden a Git. El helper recibe `prepared:true` únicamente después de cargar normal-only para no reemplazar texturas dos veces al comparar.
