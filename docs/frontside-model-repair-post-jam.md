# Reparación de modelos para FrontSide — encargo POST-JAM

Petición del usuario, 7 de octubre de 2026. Investigación delegada al subagente
`frontside_model_repair`, en la rama independiente `codex/frontside-model-repair`.
Worktree propia creada desde main `71c0fb13`. Estado: investigación iniciada;
ningún modelo candidato ni cambio de sidedness aceptado todavía.

## Alcance y pipeline

Ampliación autorizada por el usuario el 8 de octubre de 2026: continuar tanto
con reparaciones como con modelos derivados de los existentes, hechos
expresamente para FrontSide, eligiendo el enfoque que mejor funcione. Esta
autorización se ha transmitido al subagente y no rebaja los criterios de
conservación, calidad visual, coste ni beneficio GPU descritos abajo. Los
originales permanecen conservados y ningún candidato está aceptado todavía.

Priorizar cultivos y trabajadores por su repetición en fincas avanzadas.
Blender CLI/headless y scripts Python son la herramienta principal de reparación;
glTF Transform/Validator pueden complementar inspección, conversión y validación.
Conservar originales y generar candidatos reproducibles, con hashes, versiones,
parámetros y procedencia. Reparar las representaciones que usa realmente el juego,
incluidos datos empacados y estados, no únicamente GLB desconectados del runtime.

Investigar winding, normales, geometría abierta o problemática y non-manifold.
Cuando una superficie deba verse por ambos lados, resolverlo geométricamente si
es razonable, sin conservar todo el modelo como DoubleSide. Duplicar caras no
garantiza una ganancia GPU: su coste de vértices/triángulos debe medirse. Empezar
por un cultivo y un trabajador representativos antes de procesar categorías.

Preservar rigurosamente rig, skinning y animaciones de trabajadores. En cultivos,
preservar estados de crecimiento, morphs/transiciones, materiales y UV. Conservar
comportamiento, interacción física, tiempos y compatibilidad de guardados.

## Condiciones de aceptación

- Auditorías topológicas y técnicas pertinentes para FrontSide. El filtro de
  cierre de la auditoría anterior de props no constituye una aprobación visual
  ni un requisito universal suficiente para todas las superficies.
- Materiales, UV, animaciones, skinning, morphs y comportamiento conservados.
- Ningún agujero, cara desaparecida, sombra incorrecta o artefacto en ángulos,
  poses y fases de crecimiento relevantes. Validar también shadowSide, materiales
  de profundidad y shaders del juego, no solo un viewport de Blender.
- Comparaciones visuales automatizadas y multivista contra el original. Definir,
  justificar y documentar thresholds cuantitativos antes de aprobar candidatos;
  examinar silueta/alpha, regiones y outliers además de métricas globales. Solo se
  permiten diferencias mínimas de reparación, sin sacrificar calidad para pasar
  una auditoría topológica.
- Triángulos, memoria y tamaño sin aumentos desproporcionados; documentar
  presupuestos y mediciones antes/después.
- Benchmark GPU con beneficio suficiente para justificar la adaptación, con
  criterio de aceptación explícito y condiciones reproducibles. No asumir que
  FrontSide reduce a la mitad los triángulos enviados ni extrapolar FPS/móvil.

Los thresholds visuales y de beneficio no están aprobados ni fijados en este
registro: el piloto debe proponerlos con justificación y evidencia. Si un piloto
no cumple, investigar otra reparación o conservar el original, documentando el
resultado; no promover candidatos solamente porque pasan un verificador.

## Integración y revisión

Mantener candidatos sin activación por defecto durante la investigación. Tras
un piloto satisfactorio, completar cultivos/trabajadores y su evidencia, hacer
commits convencionales y abrir PR desde la rama del subagente. La raíz revisará
diff, assets, reproducibilidad, comparaciones y benchmarks. Solo si cumple todos
los criterios hará merge en main y pull. Después realizará activación controlada,
regresión visual y benchmark final sobre main. No publicar en itch.io.

Coordinar las ventanas GPU con la integración de impostores y las pruebas de la
raíz; separar mediciones de tests/builds y declarar campañas CPU concurrentes.
La reparación es independiente de la integración del horizonte. No sustituye
la matriz intensiva de cien noches ni la aceptación física móvil pendiente.

Referencias iniciales: [auditoría anterior](qa/mesh-sidedness-audit/README.md),
`src/rendering/crop-batch.js`, `src/rendering/worker-actions.js`,
`src/rendering/assets.js`, `tools/adapt_crops.py`,
`tools/register_worker_actions.py`, `tools/compress_web_assets.mjs`.
