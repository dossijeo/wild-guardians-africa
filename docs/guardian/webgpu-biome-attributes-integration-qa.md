# Instancias de bioma por atributos — integración QA

La partida con `qa-webgpu-world` utiliza ahora por defecto la implementación
existente de atributos por instancia y materiales compatibles compartidos.
`qa-webgpu-biome-native` restaura la implementación anterior, también tras
reconstruir el Worker gráfico. La ruta WebGL y el modo normal no cambian.
Esta decisión no implica que el material universal esté terminado ni que la
presentación completa tenga paridad visual.

En una ejecución por bioma, el ensayo existente
`tools/experiments/audit_webgpu_biome_material_sharing.mjs` usó WebGPU real,
activos de bioma y pase de sombra, con 19 slots y dos chunks sintéticos. La
implementación anterior solicitó 41 pipelines tras el primer chunk y 60 tras
el segundo. La nueva solicitó respectivamente 7/7 en sabana, manglares,
volcanes y gran cañón; 9/9 en gran río; y 5/5 en desierto. El número de
materiales pasó de 19 a 9, 10 o 5 según bioma. Son llamadas observadas, no
duración de compilación, tiempo GPU ni FPS.

La comparación del primer dibujo de 768×512 píxeles mostró diferencia máxima
de un nivel por canal en sabana, manglares y desierto, y cero en gran río;
un píxel superó tres niveles en volcanes (máximo 43) y otro en gran cañón
(máximo 8). Los promedios absolutos fueron inferiores a 0,00007 por canal.
En esa primera comprobación la segunda incorporación solo se midió con
contadores. Cada variante se ejecutó una vez con cámara fija. Faltan capturas
en partida real, pruebas de interacción y mediciones de frametime repetidas.
El recorte alfa experimental de sombras sigue siendo una opción independiente
y no se considera validado aquí.

Una comprobación ampliada posterior utilizó escalas no uniformes, conservó el
segundo chunk y comparó tres cámaras después de añadirlo. En cada imagen de
768×512, los píxeles con más de tres niveles de diferencia fueron como máximo
0 en sabana y gran río, 3 en manglares, 4 en volcanes, 5 en gran cañón y 1 en
desierto. El máximo por canal fue respectivamente 1, 1, 45, 70, 80 y 4. Son
diferencias puntuales en este escenario, no una prueba de paridad artística en
movimiento ni un análisis de todos los ángulos. En gran cañón la ruta anterior
creó 79 pipelines en esta ejecución; el recuento depende de lo visible y no
debe considerarse constante.

Con Vite en `http://127.0.0.1:5193` y Playwright disponible en `NODE_PATH`:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5193'
$env:QA_BIOME='sabana' # gran-rio, manglares, volcanes, gran-canon, desierto
$env:QA_EXTENDED='1' # opcional: escalas no uniformes y tres cámaras con dos chunks
.\.cache\tooling\node20.exe .\tools\experiments\audit_webgpu_biome_material_sharing.mjs
```
