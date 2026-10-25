# Recomendación conjunta de revisión

Estado: selección experimental revisable, no autorización de fusión ni certificación de todo el historial. Conservar las seis direcciones artísticas y someter el conjunto a revisión en PR159, manteniéndola en borrador. La receta reproducible es tools/experiments/global-current-review-recipe.mjs; sus opciones no son todos los defaults del juego.

## Selección y coste residente

Intel UHD 0x9A60, Chrome/ANGLE D3D11, 1280x720, perfil medio. Rangos de las dos ejecuciones por fase; GPU elapsed incluye burbujas del pipeline. No son FPS de simulación activa ni diferencias contra main.

| Bioma | Selección que conservar | GPU día ms | GPU noche ms |
|---|---|---:|---:|
| Sabana | Hierba continua, calidez, volumen/sombras, suelo lejano fino | 16.72–16.79 | 17.33–17.90 |
| Gran Río | Cobertura verde continua, suelo despejado en poblado, ribera, suelo lejano fino | 18.27–18.45 | 18.59–19.02 |
| Manglares | Helechos holly con LOD, musgo/barro localizado, agua azul y caché fija 512 | 21.62–22.23 | 22.33–23.03 |
| Desierto | Arena y sombras aprobadas, sin añadir agua inexistente en el bioma | 15.15–15.31 | 16.51–16.61 |
| Volcanes | Roca/ceniza, lava aprobada intacta y suelo lejano fino | 16.82–16.93 | 17.46–17.67 |
| Gran Cañón | Estratificación, suelo cálido, ribera equilibrada, reflejos calm y handoff atómico | 14.12–14.61 | 15.20–15.35 |

La matriz current-resident-cost contiene 48 ejecuciones válidas de seis biomas × día/noche × media/baja × dos repeticiones, más controles y fallos conservados. Los informes separan CPU, GPU, presentación y sus máximos. En media Manglares registra máximos de presentación alrededor de 50 ms aun en escena residente. Baja reduce costes pero pierde sombras y detalle: no sustituir la referencia artística por baja ni prometer 60 FPS.

## Lectura artística y evidencia

Las referencias se usan por volumen, masas de vegetación, calidez, separación de sombras y transición de materiales, no por equivalencia de escena. La revisión de los montajes históricos con mockups confirma esas direcciones; sus etiquetas de current son históricas y no describen HEAD. Las aprobaciones posteriores del usuario sustituyen la antigua hoja redonda por helechos y mantienen Desierto/lava. No recrear raíces ni modificar siluetas originales para imitar imágenes generadas.

- Comparación con renderer anterior: elevated-review/README.md y main-current-gallery.json. Main histórico b2497b0695218652672c805c40971ea830686e3a, no origin/main actual.
- Capturas residentes actuales: current-resident-cost, con fuentes y hashes por ejecución.
- Movimiento nativo reciente: EXACT-RECIPE-MOTION.md, MOTION-RECONCILIATION.md, volcanes-exact-recipe-motion. La comparación de URLs reconcilia Manglares/Desierto/Cañón, sin fingir que sus fuentes históricas son idénticas a HEAD.
- Cielo y fondos: SKY-BACKGROUND-REVIEW.md, montaje de doce vistas y canyon-sky-visible/README.md. Conservar el ajuste atmosférico; no añadir contraste global a ciegas.
- Detalles azules de Sabana: aislamiento real confirma plant_02 original, no huecos del terreno; conservar el asset.

## Recursos y límites

Los helechos derivados del GLB del usuario conservan autor, licencia CC0, URL y hash en public/assets/visual-lab/holly-fern-frond-20261023/source.json; el LOD enlaza esa procedencia y su bake en holly-fern-lod-20261023/source.json. La normal de arena Aerial Beach 01 está documentada en desert-aerial-sand/SOURCE.md. El cielo reutiliza recursos originales.

No se declara eliminada toda unión de suelo: en la vista oblicua de Volcanes queda un desnivel visible. Las capturas y recorridos comprueban escenas concretas, no todos los mundos posibles. Los LOD lejanos de helechos usan iluminación precalculada y no reproducen todas las sombras dinámicas cercanas. Los límites de memoria, carga y streaming pertenecen a sus informes específicos; los vídeos no sirven como benchmarks.

La rama incluye cambios arquitectónicos autorizados después del objetivo artístico original, además de cambios heredados. No presentar toda la diferencia contra main como exclusivamente gráfica ni declarar invariantes de simulación a partir de capturas. La integración requiere delimitar ese alcance y revisar las pruebas funcionales correspondientes. Este informe consolida la selección visual; no convierte una validación artística en autorización para fusionar.

El atlas manual del taller permanece en pausa. Menú por capas/parallax y microeventos mantienen la secuencia posterior solicitada. No reabrir materiales aprobados por microdiferencias sin relevancia en juego normal.

## Verificación posterior de main (25 octubre)

`git ls-remote origin refs/heads/main` devuelve b2497b0695218652672c805c40971ea830686e3a, exactamente la base de las comparativas. origin/main local coincide y ese commit es ancestro de la rama experimental. Por tanto, la base histórica sigue siendo main remoto actual en esta fecha; no hay motivo para repetir las comparativas por un supuesto avance de main. Las capturas candidatas siguen siendo archivadas y mantienen sus límites propios. main-reference-verification.json conserva la comprobación.

Control de regresión seleccionado: 26/26 pruebas aprobadas de cobertura continua, helechos/caché, suelo lejano y agua/ribera/reflejos. Salida en selected-visual-tests.tap. Se ejecutaron con el loader local de Wild Three.js; esto no certifica por sí solo el historial funcional completo ni un empaquetado de distribución.
