# Variante de pantalla de props recortados preparada durante carga

Base 98dfa2c. Continúa la [cobertura de precarga](../preload-biome-coverage/README.md), que identificó un programa alpha instanciado nuevo antes de medir el movimiento.

## Causa aislada

El nuevo parámetro QA appearance-profile=1, junto a timing=1, mide los dos primeros renders después del spawn/enfoque con los observadores GL/CPU existentes, restaurándolos al terminar. No cambia ticks, cámara, navegación ni recetas. Las filas CPU son inclusivas y se solapan; el reloj total incluye instalar/restaurar las envolturas.

En Gran Río, el primer frame registra dos compileShader y un linkProgram para MeshStandardMaterial, instanciado, alphaTest=0.35, receiveShadow=true. El material posee nativeChunkClip, nativeObstruction, nativeSurface y artBounds. La clave anterior es srgb-linear sin shadow-map; la nueva, srgb con shadow-map. GetProgramInfoLog tarda 49,4 ms dentro del frame de 84,8 ms; no es una medición GPU ni coste exclusivo de compilador.

La clave native-chunk-clip corresponde al slot 19 (special_03), el **remanso con orilla rocosa**, no identifica específicamente un árbol. El diagnóstico anterior lo agrupó como vegetación alpha por su material/LOD. Su receta de profundidad ya estaba preparada, pero el remanso quedaba fuera de la vista inicial y no se dibujaba en pantalla.

## Cambio

Durante warmAnimalGpu se compilan también todos los materiales residentes para pantalla, con sombras en su estado real, antes de preparar profundidad e inicializar bindings/diagnósticos. compileAsync recorre los meshes incluso en LODs no dibujados en la apertura. Se conserva el material original y sus referencias; no se crea una receta sintética ni se cambia fragment/vertex shader, paleta, geometría, culling o simulación.

La espera mantiene la barrera disposed antes de continuar y reutiliza el try/finally de preparación existente. Los experimentos de alpha-depth y filtro de vacíos permanecen desactivados. La variante descartada del turno anterior compilaba para pantalla sin sombras: no era esta combinación de color/estado de sombras y no se presenta como la misma solución.

## Pruebas nativas

IAB desktop, seed 712, Mapungubwe, calidad media. Centro/brote pagados, contratación de cero para casos individuales y spawn controlado. Antes de spawn: asentamiento, espera de chunks y baseline; después: dos renders perfilados y 60 de aparición sin avanzar reloj. Movimiento real en pasos de 50 ms hasta contacto; no es incursión natural, noche completa ni móvil físico.

| Caso | CPU primer render | Nuevos compile/link en los dos primeros renders | Programas nuevos de aparición | CPU máxima durante movimiento |
| --- | ---: | ---: | ---: | ---: |
| Gran Río / búfalo, referencia | 84,8 ms | 2 / 1 | 1 | Ver informe |
| Gran Río / búfalo, preparado | 28,6 ms | 0 / 0 | 0 | 25,8 ms |
| Sabana / hiena, preparado | 42,4 ms | 0 / 0 | 0 | 29,7 ms |
| Gran Cañón / grupo hasta golpe al centro, preparado | 29,5 ms | 0 / 0 | 0 | 27,3 ms |

Todos terminan ok:true, sin errores ni compile/link durante los recorridos preparados. En esos dos renders tampoco se consultan logs en los casos preparados. Gran Río conserva exactamente los campos de pasos/esperas, contactos/eventos, actores/posiciones/altura/visibilidad, efectos y HP frente al diagnóstico. El grupo conserva los mismos campos frente a warm-canyon-group, incluidos 364 pasos, StructureHit y centro 600→580. No demuestra que las cinco especies atacaran en ese grupo.

Las capturas de Gran Río se inspeccionan visualmente. La comparación de 720.000 píxeles, excluyendo panel QA/botón/scrollbars, registra 35 píxeles diferentes, máximo 2/255 por canal RGB. No es igualdad exacta, ni prueba de todas las vistas/biomas/estados; no se atribuye la pequeña variación sin otra prueba. Se conserva máscara/dimensiones/métrica en pixel-comparison.json.

## Costes y límites

Carga referencia Gran Río 5.386,3 ms; preparado 5.439,2 ms; Sabana 5.468,4 ms y grupo 5.266 ms. Son muestras individuales, sin A/B controlado de tiempo de carga. En Gran Río se pasa de 45 a 54 programas tras carga/aparición; los bindings inicializados pasan de 28 a 41. Se adelanta trabajo a la carga y se conservan más variantes; no son bytes/RAM medidos ni prueba de que el tiempo total no aumente.

Se elimina la compilación observada del remanso en estos casos, no todos los picos. Quedan subidas/primera utilización de geometría, trabajo de chunks/LOD/batching al enfocar, el pico previo sin compilación, coste sostenido de color/profundidad, otros estados/culturas/calidades, móvil y carga/memoria. Nuevos materiales/variantes generados después no están cubiertos necesariamente por esta preparación de residentes.

## Verificación y procedencia

79 pruebas dirigidas correctas (6.300,99 ms), incluidas propiedad/restauración/fallos de profundidad, bindings/diagnósticos, precarga de agua/lava/animales/VFX, observadores y recetas nativas. Build correcto: 207 módulos, 26,84 s, aviso habitual de bundle >500 kB. No se ejecutaron pruebas/build simultáneamente con las mediciones nativas.

Informes completos leídos del DOM, gzip determinista con hashes comprimidos/descomprimidos, capturas y fuentes exactas en esta carpeta. Diagnostic usa runtime base; los tres casos preparados usan scene-final. Todos usan el mismo fixture con perfil de aparición. proof.json registra comparaciones y referencias. El CI anterior 95cb9d2 pasó Validate game y Build Windows desktop; 98dfa2c pasó Validate game y Windows seguía ejecutándose al comprobarlo. Estos estados no validan aún el nuevo cambio.
