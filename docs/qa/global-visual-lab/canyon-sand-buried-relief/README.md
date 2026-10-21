# Atenuar parallax de grava bajo depósitos de arena

Candidata QA, no optimización aprobada. Compara arena seca normal-only completa (izquierda) con atenuación del parallax de la grava donde domina arena (derecha). No compara con terreno original sin arena.

[Primer plano día](media-day-2-pair.webp) · [Primer plano noche](media-night-2-pair.webp) · [Registros](captures.json) · [Comparación](comparison.json).

## Cambio y fundamento

El material calcula primero POM de grava (hasta ocho lecturas de altura) y después mezcla arena normal-only. La candidata calcula el mismo campo procedural de depósito antes del POM y lo reutiliza después, sin duplicar los dos ruidos. Multiplica reliefFade por 1-smoothstep(.55,.90,deposit). Por debajo de .55 conserva el parallax; desde .90 lo omite; entre ambos reduce desplazamiento progresivamente. Mantiene normales de arena, color medio, rugosidad y corrección especular seca.

La grava no está completamente invisible: incluso con depósito1 su peso residual es .1. Por eso esta es una aproximación artística, no una eliminación algebraicamente exacta de trabajo muerto. No evita las tres lecturas base de grava (color, normal, ARH), ni cambia geometría, draw calls o mapas cargados. El ahorro de muestras depende del píxel y del bucle original; no hay conteo de invocaciones GPU ni ahorro de tiempo medido aún.

## Evidencia visual

24 capturas,12 parejas, media/baja, día150/noche350, tres poses cercanas, seed712,1280×720. Cámara, objetivo, hora, draw calls y triángulos coinciden. Una textura adicional en ambas variantes, sin errores registrados. Las parejas más cercanas de calidad media, día y noche, fueron inspeccionadas: conservan ondulaciones y composición, con cambios finos de grava residual. MAE0.383–0.535/255; no es paridad exacta ni criterio de calidad por sí solo. Las otras poses están publicadas para inspección, no se afirma revisión visual exhaustiva.

Conservar para benchmark directo frente a normal-only sin atenuación. No activar por defecto: faltan coste real, vídeo de transiciones y streaming. Una reducción teórica de lecturas puede no mejorar GPU por divergencia o carga dominante en otros términos. La máscara precalculada descartada anteriormente no se reactiva.

## Reproducción

Vite5190, Chrome/Playwright y Python/Pillow/NumPy:

```powershell
node tools/experiments/capture-canyon-sand-buried-relief.mjs
python tools/experiments/package-canyon-sand-buried-relief.py
```

Opción buriedRelief=false por defecto en el interceptor QA. Sin cambios de renderer principal, simulación, navegación, modelos ni main. No nuevos recursos externos. PNG locales; WebP sin pérdida originales y pares comprimidos publicados.
