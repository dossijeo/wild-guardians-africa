# Paleta cálida en sombras del suelo del Cañón

Candidata QA independiente, fuente 0c9240d31. No integra el ensayo descartado de textura al pie de pared. No cambia edificios, modelos, geometría o simulación.

## Diagnóstico y cambio

El relleno integrado usa la sombra del perfil canyons [0,22;0,27;0,36], que enfría el suelo arenoso hasta un gris. Esta variante propone [0,38;0,255;0,18] normalizado para conservar la luminancia Rec.709 del relleno anterior. Es una elección artística, no cálculo físico de rebote. Conservar luminancia del iluminante no garantiza igual luminancia final tras albedo y tonemapping.

Solo actúa en sombra diurna y superficies ascendentes mediante la visibilidad solar existente y una máscara de normal .74–.96. No modifica la luz solar directa ni la receta nocturna. No reduce el relleno de caras verticales como el ensayo canyon-sky descartado.

## Resultado

[Antes oblicuo](gran-canon-base-oblique-day.webp) / [candidato](gran-canon-candidate-oblique-day.webp). [Vista normal](gran-canon-candidate-normal-day.webp).

Recupera color arenoso en las orillas sombreadas manteniendo separación con las zonas soleadas. Conservar como dirección cromática candidata. No es una mejora de geometría, acumulación de vegetación o volumen de pared, ni acredita la calidad global de los mockups.

## Validación

Ocho capturas reales, cámara normal dentro del corredor y oblicua, día/noche; semilla712, media, 1280×720. Cuatro parejas con cámara, objetivo, hora, entidades, draw calls y triángulos informados iguales. Sin errores GL, consola, página o HTTP registrados. WebP sin pérdida comprobado contra PNG. [Datos](captures.json), [comparación](comparison.json).

Cada par nocturno difiere en un píxel por un nivel de canal; no es igualdad exacta. El peso del shader es cero de noche, pero no se ha aislado la causa del residual de rasterización/compilación entre páginas. No atribuir una alteración artística nocturna a ese residual ni ocultarlo.

No añade texturas, geometría o draw calls. Añade operaciones aritméticas por fragmento y reutiliza visibilidad/normal; no se mide un nuevo coste temporal en esta sesión, cuya deriva quedó demostrada incluso con control nulo. No se declara gratuito ni aprobado para rendimiento. Los contadores no sustituyen un benchmark GPU.

## Límites y recomendación

Solo materiales residentes. Falta binding de chunks/horizonte, prueba con construcción y otras semillas/calidades, comparación temporal fiable y revisión de la coherencia con sombras de objetos. No activar por defecto; main intacto. Mantener la dirección sin barrer intensidades hasta resolver el conjunto, y no confundir calidez con relieve.

Reproducir: `node tools/experiments/capture-canyon-warm-floor.mjs`, servidor del worktree en5190.
