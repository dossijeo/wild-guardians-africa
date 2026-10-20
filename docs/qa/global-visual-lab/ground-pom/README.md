# Sabana: relieve de fibras sin geometría

Experimento del 20 de octubre de 2026, sobre `codex/global-visual-lab`, iniciado en `b4999b405`. Solo herramientas y recursos de QA: **el renderer por defecto no cambia**. No se añaden matas, modelos, triángulos, instancias, draw calls ni pasadas. No se extiende a otros biomas.

**Resultado: no se alcanza el volumen del mockup. No integrar C/D/E/F.** C elimina buena parte del escalonado visible del POM original, pero D no convierte el tapiz en una capa de fibras con acumulaciones convincentes. E parece una superficie moldeada; F suaviza ese defecto a costa de aplanar las fibras. Desde cámara normal, las mejoras son mucho menos evidentes.

Comparativas reales A–D: [cercana de día](comparison-close-day-ABCD.jpg), [cercana de noche](comparison-close-night-ABCD.jpg), [juego de día](comparison-game-day-ABCD.jpg), [juego de noche](comparison-game-night-ABCD.jpg). Los mosaicos JPEG sirven para revisar la composición; cada captura individual se conserva como WebP **sin pérdida**, con verificación de píxeles en [lossless-images.json](lossless-images.json).

Diagnósticos descartados: [E/F de día](comparison-close-day-diagnostics.jpg), [E/F de noche](comparison-close-night-diagnostics.jpg). Movimiento: [original A](motion-day-A.webm), [POM C](motion-day-C.webm), [POM + microoclusión D](motion-day-D.webm), [D nocturno](motion-night-D.webm). Los vídeos reproducen una trayectoria determinista a 20 fps; **no son un benchmark de fluidez**.

En Intel UHD, primer plano diurno/media: A **14,332 ms GPU**, C **16,340 ms**, D **15,692 ms**. En baja: A **10,719 ms**, C **11,204 ms**, D **12,541 ms**. La CPU de envío se mantiene en unos 3–4 ms; su variación no demuestra una optimización de CPU. Hay deriva apreciable incluso entre A/B idénticos: se entregan [todas las medias CPU/GPU](BENCHMARKS.md), P95, bloques y datos crudos, sin presentar diferencias pequeñas como ventajas fiables.

La recomendación es conservar el shader actual y el refinamiento C como herramienta de investigación. Antes de aumentar muestras o profundidad, hace falta un conjunto de altura/normales/oclusión coherente y de procedencia verificable, con acumulaciones y fibras separadas en escala. Un bake material coherente podría seguir siendo viable sin geometría en el juego; estos resultados no justifican prometer el aspecto del mockup ni extender el cambio a Gran Río.

## Qué se compara

| Variante | Material / iluminación |
|---|---|
| A | Renderer original de la rama, sin `visualLab=global-lighting`. |
| B | Control de iluminación continua con mapas y POM originales. Es deliberadamente equivalente a A: Sabana **ya** usa BRDF continuo y `filmic4`. |
| C | B + POM adaptativo, refinamiento de intersección, atenuación por distancia/ángulo y cobertura/desgaste. Mapas originales. |
| D | C + micro-AO y visibilidad solar precalculadas desde la altura original. Sustituye la antigua oclusión del material; no la multiplica de nuevo. |
| E | Diagnóstico adicional: altura inferida del color, normales físicamente coherentes y microoclusión. Demasiado grueso, aspecto moldeado. |
| F | Diagnóstico adicional: 85 % de la altura asignada a acumulaciones amplias y 15 % a fibras. Más suave, pero pierde detalle. |
| A2 | Vuelta a A después de todas las variantes. Control contra contaminación de caché. |

E/F no son reconstrucciones medidas ni nuevos assets externos. Conservan exactamente el archivo de color. Cambian la hipótesis de altura y sus normales, por lo que no se atribuye su diferencia únicamente a la oclusión.

## Auditoría del pipeline

- `BiomeGround` carga base, normal y ARH como datos sin conversión sRGB automática, `flipY=false`, repetición, mipmaps y anisotropía 8. `AfricanToon` convierte el color antes del BRDF.
- La ruta mapeada de Sabana evalúa `groundMaterial417`, usa su normal en `brdf4`, reflejos y sombras, y termina con `filmic4`. No hay cuantización toon en ese tramo. El toon de edificios y personajes permanece intacto.
- El tile actual tiene escala `0.155`: aproximadamente **6,452 m por repetición**. En 1024² son **6,30 mm por texel** antes de minificación. No se ha probado que esa escala corresponda a una escala física del recurso original.
- La altura configurada es **75 mm**. Los percentiles 1–99 del canal B ocupan unos **45,9 mm** de ese intervalo. No se ha aumentado esa profundidad.
- El POM original realiza hasta ocho lecturas, avanza en escalones de 1/8 y no refina la intersección. Limita el denominador angular a 0,36; se atenúa con la huella del píxel. Base, normal y ARH sí comparten las UV desplazadas.
- La normal original no se reconstruye de esa altura. La correlación local entre gradiente de altura y canales normales es aproximadamente **0,0033 y −0,0050**. **Ese dato no demuestra por sí solo falta de coherencia.** El [bake posterior de geometría conocida](../ground-fiber-bake/normal-coherence-counterexample.json) también da correlaciones bajas (−0,024 aproximadamente): las discontinuidades de altura entre fibras superpuestas dominan el gradiente, mientras las caras superiores siguen mirando hacia arriba. Se retira la interpretación anterior de «indicio fuerte». La procedencia y alineación de los mapas originales siguen sin demostrarse. Véanse [mapas](source-maps.webp), [canales ARH](arh-channels.webp) y [auditoría numérica](material-audit.json).
- La AO original se remapea con `mix(.45,1.,arh.r)`: sus percentiles 1–99 se comprimen aproximadamente a 0,827–0,950. Además atenúa la luz directa mediante `mix(.48,1.,materialAO410)`, sin representar una dirección solar ni el punto de intersección POM.
- Las sombras del mundo siguen viendo la geometría real. Ninguna variante cambia profundidad del framebuffer, siluetas, contacto geométrico ni oclusión mutua con objetos.

## Precálculo y coherencia

`bake-ground-pom.py` usa NumPy/SciPy sobre un material periódico reutilizable, no sobre parcelas del mundo. Calcula horizontes en 16 direcciones para AO y una dirección independiente para visibilidad solar. Radio máximo: 32 texels, aproximadamente 20 cm. La dirección se obtiene del juego real: `[-0.804502, 0.510172, 0.304141]`, transformada a las coordenadas rotadas del material.

El mapa adicional almacena AO en R y visibilidad solar en G. D reemplaza la AO previa del material en luz ambiente/reflejada; conserva la oclusión de contacto del mundo. La visibilidad direccional afecta solo a la parte solar, con `mix(visibility,1.,uNight)`. No se aplica al componente nocturno. El bake horizontal se desvanece en pendientes y con minificación. Es una aproximación de altura, sin dispersión múltiple ni fibras superpuestas.

E utiliza luminancia filtrada a dos escalas; F reduce la amplitud de las fibras a un máximo nominal de 11,25 mm y dedica el resto a acumulaciones amplias. Sus normales proceden de diferencias periódicas de la misma altura y del mismo tamaño de texel. Se corrige explícitamente la base tangente Y para esos mapas generados. No se interpreta la reflectancia del color como evidencia física de altura.

El POM refinado conserva 75 mm, emplea entre 4 y 12 pasos, dos refinamientos binarios y una interpolación final. Se atenúa entre 12 y 45 m y en ángulos casi rasantes; conserva también la atenuación por huella original. Las máscaras permanecen ancladas al mundo y el desplazamiento se reduce con cobertura/desgaste. La rugosidad y el color siguen usando las mismas UV que la normal.

La prueba independiente fuerza el canal de visibilidad solar a 0 y 255 conservando la AO: de día cambia la imagen (MAE 10,047 en canales de 8 bits); **de noche los píxeles son exactamente idénticos**. La vuelta a 0 también recupera exactamente el control. Véase [solar-motion-audit.json](solar-motion-audit.json).

## Capturas y validación

Campaña real iniciada desde el menú, Sabana/Mapungubwe, semilla 712; simulación pausada únicamente para QA. Resolución 1280×720, DPR 1; calidades media/baja; tiempos 150/350; vistas cercana oblicua y normal. Posiciones de cámara, objetivo, sol, entidades y contadores en `captures-media.json` y `captures-baja.json`.

Se detectó y corrigió una contaminación de uniforms al reutilizar programas de un mismo material entre variantes. El comparador invalida ahora el estado del material al restaurarlo y conserva los recursos mientras existan programas que los referencien. Se repitieron las capturas y benchmarks afectados. **A/B y A/A2 deben ser idénticos en las ocho combinaciones**, no solo parecidos.

Contadores de frame completo, idénticos entre variantes:

| Perfil / vista | Draw calls | Triángulos |
|---|---:|---:|
| Media / cercana | 80 | 1.096.223 |
| Media / juego | 70 | 919.436 |
| Baja / cercana | 76 | 830.721 |
| Baja / juego | 66 | 673.649 |

Los matorrales nativos y todas las entidades se conservan. Las matas añadidas por experimentos anteriores no se cargan para esta prueba del renderer original. Las capturas proporcionadas sirven como dirección artística; no se inventa una equivalencia exacta con su cámara o estado anterior.

Los ocho clips comparten las mismas 72 posiciones y objetivos de cámara. La revisión de los fotogramas muestra menos bandas de intersección en C/D, pero persisten estiramiento y apariencia de superficie continua a ras de suelo. No se presenta esto como una desaparición completa de los artefactos temporales ni como una validación en todo hardware WebGL.

## Coste que debe interpretarse

Las lecturas son **instrucciones lógicas del material**, no transacciones físicas de memoria ni contadores de hardware: anisotropía, filtrado y divergencia pueden multiplicar el trabajo.

| Variante | Lecturas del material con POM activo, cota superior | Recursos adicionales frente a A |
|---|---:|---|
| A/B | 12: máscara + 3 mapas + hasta 8 alturas | Ninguno |
| C | 19: máscara + 3 mapas + hasta 15 alturas | Ninguno |
| D | 20 | 1 mapa 1024²: ~5,33 MiB RGBA8 con mipmaps |
| E/F | 20 | 3 mapas de QA: ~16 MiB, manteniendo los originales residentes |

Sin POM son cuatro lecturas en A/B/C y cinco en D/E/F. Los shaders conservan las lecturas de sombras, entorno y contacto, no incluidas en esta tabla. El benchmark mantiene los mapas opcionales residentes para no mezclar subidas de textura con el coste de dibujado. No es una medición de VRAM exacta del controlador.

Además de las cotas estáticas, un shader de diagnóstico cuenta las lecturas de altura realmente ejecutadas en cada fragmento visible de terreno mapeado. En media/cercana: A **3,615** de media (máximo 8), C/D **5,951** (máximo observado 13), F **7,100** (máximo 14). En media/juego: A **3,199**, C/D **4,353**, F **4,890**. Hay histogramas de ambas calidades en [texture-fetches.json](texture-fetches.json). Este modo diagnóstico no se utiliza para medir GPU; sus lecturas lógicas no equivalen a taps anisotrópicos ni transacciones de memoria.

`measure-ground-pom.mjs` mide CPU de envío y GPU mediante `EXT_disjoint_timer_query_webgl2`, incluyendo las pasadas del render real, sin capturas dentro del intervalo. Orden A B C D F F D C B A, 30 frames de calentamiento y 120 muestras por bloque. A/B son el control de ruido; invertir el orden ayuda a detectar deriva, pero no elimina toda la variabilidad térmica/del sistema.

## Procedencia y límites

Los tres mapas actuales proceden del recurso embebido `Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo.html`, según el manifiesto del repositorio. Sus SHA-256 se documentan en la auditoría.

La etiqueta del material dice «Grass Medium 01 · seco (tapiz adaptado)». El [recurso oficial de Poly Haven](https://polyhaven.com/a/grass_medium_01), de Rico Cilliers y Rob Tuytel, es un modelo con mapas de color, normales, AO, rugosidad y alpha; no presenta un mapa de desplazamiento en su lista de descargas. Su licencia es [CC0](https://polyhaven.com/license). **No se ha establecido que el ARH adaptado sea una altura original de Poly Haven.** En este pase no se descargan ni incorporan nuevos recursos externos.

El experimento no demuestra que el volumen del mockup sea imposible mediante materiales. Sí permite separar la estabilidad numérica del POM de la calidad de la estructura que representa. Un height field no representa capas de fibras con huecos, voladizos y siluetas; derivar altura del color tampoco resuelve automáticamente esa estructura.

## Reproducción

Con el servidor del worktree en `http://127.0.0.1:5190`:

```powershell
node tools/experiments/probe-ground-pom.mjs
python tools/experiments/bake-ground-pom.py
node tools/experiments/capture-ground-pom.mjs
node tools/experiments/measure-ground-pom.mjs
node tools/experiments/record-ground-pom.mjs
node tools/experiments/check-ground-pom-solar.mjs
node tools/experiments/count-ground-pom.mjs
python tools/experiments/audit-ground-pom.py
python tools/experiments/archive-ground-pom.py
```

Requiere Chrome/Playwright, FFmpeg en la ruta indicada por el grabador y Python con Pillow, NumPy y SciPy. Las variantes se inyectan exclusivamente desde el harness de QA, sin modificar archivos del renderer ni opciones por defecto. Ejecutar los benchmarks sin otras cargas gráficas ni procesos de bake/compresión en paralelo.
