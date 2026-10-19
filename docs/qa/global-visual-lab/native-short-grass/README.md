# Hierba corta nativa en Blender: ahorro geométrico, resultado artístico insuficiente

**No adoptar.** Se conserva `plant_02` original. Este ensayo sustituye una unidad existente en QA, en lugar de añadir una capa de matas o cambiar distribución. La variante tiene tres LOD y permanece dentro de los límites del original; cambia su geometría y silueta interna, no modifica el archivo fuente. No se integra en runtime ni se generaliza.

## Autoría y revisión

El original usa 2.922 / 1.747 / 552 triángulos por LOD para una planta de 0,45 m. Se modelaron hojas plegadas y curvadas mediante una lista explícita de 28 hojas en Blender, con colores de vértice y sin textura. El `.blend` conserva mallas editables. No se aplicó un simplificador al original ni ruido para fingir detalle.

La primera versión era un abanico de hojas finas y oscuras; perdía masa. La segunda amplió anchura y paleta, pero la vista cercana mostró una forma de abanico demasiado clara. La tercera recuperó tres núcleos de brotes, una curvatura más erguida y colores sRGB convertidos explícitamente a lineal. Es la versión del directorio principal.

La candidata final tiene bordes más limpios y menos geometría, pero **parece pequeños brotes de maíz y pierde la presencia de una mata seca**. En la cámara de juego se lee como plantas pequeñas dispersas, no como la agrupación de hierba del mockup. De cerca el material es demasiado limpio y las hojas demasiado regulares. No es una mejora artística suficientemente clara. El ahorro de polígonos no sustituye ese criterio.

Los directorios `initial-thin` y `wide-fan` conservan modelos/capturas de las iteraciones negativas, con una limitación importante descrita abajo. No son alternativas recomendadas.

## Corrección de la fixture antes de concluir

La sustitución en caliente inicialmente actualizaba prototipos y mallas residentes, pero el agrupador `NativeAssetGroups` conservaba las vistas geométricas del slot anterior por clave slot/LOD. Por ello, la primera cámara mostraba todavía la geometría anterior; al cambiar de cámara podían reconstruirse algunos grupos. **Las capturas de las dos iteraciones iniciales no son comparativas A/B fiables del conjunto y no se usan para afirmar mejora ni coste.** Sus vistas cercanas sirvieron para identificar problemas de autoría, no para medir cobertura global.

Se corrigió el instalador QA retirando únicamente los grupos `8:*`. El siguiente render reconstruye sus vistas desde los nuevos prototipos. Las 24 capturas del directorio principal se repitieron después de corregirlo: cámaras de juego, baja y espécimen; Sabana/Gran Río; día/noche. `mesh-audit.json` registra los grupos retirados, y el descenso real de triángulos en la primera cámara confirma que la sustitución está activa. No se alteró el agrupador de producción.

## Costes verificados

| Recurso | Original | Candidata |
|---|---:|---:|
| Triángulos LOD 0 / 1 / 2 | 2.922 / 1.747 / 552 | 616 / 360 / 168 |
| Buffers LOD 0 | 278.556 B | 70.224 B |
| Buffers LOD 1 | 177.330 B | 38.160 B |
| Buffers LOD 2 | 64.608 B | 19.152 B |
| Sabana, cámara juego: draws | 86 | 86 |
| Sabana, cámara juego: triángulos | 1.267.265 | 1.207.762 |
| Sabana, cámara baja: draws | 89 | 89 |
| Sabana, cámara baja: triángulos | 1.430.023 | 1.326.235 |

Los buffers originales incluyen tangentes; los nuevos no usan mapas y emplean color de vértice. Son tamaños de arrays, no VRAM medida. Las cantidades de geometrías y texturas coinciden por pareja. El GLB QA añade 130.336 bytes de descarga: el binario compartido original sigue cargándose para las demás unidades. No se afirma ahorro neto de descarga ni liberación de todo el atlas original. El material derivado es opaco y DoubleSide, frente al material nativo con alpha test; menos triángulos no garantiza menos coste de fragmentos.

No se ejecutó ABBA CPU/GPU: la candidata no supera la evaluación artística y las capturas finales coincidieron con una campaña CPU externa. No se publican tiempos contaminados ni se infiere aceleración por el número de triángulos.

## Integridad y límites

`comparison.json` conserva SHA-256 del catálogo, binario y tres mapas originales y verifica que coinciden con Git HEAD. Cámaras iguales por pareja, sin errores de shader/navegador; Gran Río no recibe ninguna sustitución. Posiciones y cantidad de instancias proceden del sistema existente. La variante respeta los límites espaciales del slot, pero no tiene identidad visual suficiente para reemplazarlo.

Los originales se retienen en la caché QA. Una integración futura necesitaría propiedad/liberación explícitas, validación de transiciones LOD y cobertura al entrar/salir de chunks. El instalador reemplaza prototipos para nuevas entradas, pero esa continuidad no se presenta como validada por estas capturas fijas. No se cambiaron navegación, colisiones, cultivo o simulación.

## Reproducción

`blender --background --python tools/experiments/blender-native-short-grass.py`, seguido de `node tools/experiments/capture-native-short-grass.mjs` con Vite en 5189. El parámetro de URL por sí solo no activa una variante runtime. Los scripts JS pasan comprobación sintáctica; Blender exporta los tres LOD y WebGL los carga sin errores. No hay cambios runtime posteriores al build correcto de `dd3da8b4`.
