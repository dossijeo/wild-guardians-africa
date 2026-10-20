# RheaGrass: viabilidad para Wild Guardians

Investigación de código, 2026-10-20. Rama `codex/global-visual-lab`. RheaGrass inspeccionado en `bdf2dd4cbed87e496cc289c1bb20ee6245259a18`; Wild Guardians en `ab104764` con experimentos locales pendientes. No se ha ejecutado Unity ni implementado o medido un port. El ensayo de materiales queda separado; sus capturas L terminaron sin errores.

## Dictamen

Viable adaptar la idea de hojas animadas mediante instancing y vertex shaders WebGL2. No es viable importar directamente el shader de RheaGrass. Recomendación: prototipo pequeño sobre las matas 3D de Blender existentes, con viento coherente, máscaras y presupuesto visible; no migrar de renderer para adoptar esta demo.

RheaGrass aporta siluetas y desplazamiento real de hojas porque genera triángulos. No es volumen mediante ray marching ni una mejora del POM. Por tanto, sería un experimento de vegetación separado del ensayo anterior sin geometría. Tampoco convierte por sí mismo la textura seca del suelo en acumulaciones de fibras como el mockup.

## Evidencia del repositorio

Proyecto Unity 2020.3.14f1, URP 10.5.0 (manifest real; el README enlaza documentación URP 11). `GeometryGrass.shader` exige geometry shaders y teselación hardware, con etapas hull/domain/geometry. WebGL2 no expone esas etapas; traducir HLSL a GLSL no basta.

La teselación controla densidad con distancia. Cada hoja usa cuatro segmentos: la tira afilada emite nueve vértices/siete triángulos; la rectangular diez/ocho. Son cintas curvas de doble cara, opcionalmente recortadas por atlas, no matas cerradas con grosor. Su efecto visual puede ser atractivo, pero no debemos reintroducir los planos cruzados descartados ni confundir una cinta con volumen sólido.

El viento desplaza una textura vectorial en el tiempo y aplica rotaciones a los vértices superiores, manteniendo la raíz. Es animación procedural, no simulación física. `SetDisplacementLocation.cs` escribe una única posición global: varios objetos competirían por ese valor, no forman un sistema multiagente. Las estelas con RenderTextures se sugieren en README, no están implementadas como sistema completo.

El fragment shader combina atlas, gradiente y variación de color con sombra solar/ambiente. No transmite normales de hoja al fragmento ni calcula una BRDF direccional por hoja. También aumenta brillo según viento. Reutilizarlo literalmente comprometería coherencia cromática y nocturna. Existe ShadowCaster que vuelve a generar la geometría; las sombras no son gratuitas. El autor advierte expresamente que soporte y rendimiento pueden no ser adecuados para uso general en juegos. No hay benchmark reproducible de hardware comparable en el material inspeccionado.

Licencia raíz CC0-1.0. Registrar URL, revisión y archivos reutilizados; conservar procedencia de la función angleAxis atribuida a Keijiro. No se han importado assets al juego en esta investigación.

## Encaje real en Wild Guardians

`package.json` fija Three.js 0.180.0; `src/rendering/scene.js` crea WebGLRenderer y sombras PCF. Ya hay InstancedMesh y gestión de terreno por chunks. `blender-ground-details.js` proporciona colocación visual, máscaras y eventos de ocupación; `qa-grass-streaming.js` prueba presupuesto de 192 matas, selección visible e histéresis. Este último declara pendientes LOD e integración: es infraestructura experimental, no solución terminada.

Adaptación propuesta:

1. Reutilizar mallas curvas de Blender, con atributo de peso raíz/punta y fase por mata. Mantener geometría y material compartidos mediante instancing.
2. Aplicar viento en vertex shader: campo espacial común, ráfagas lentas y oscilación pequeña por mata. Usar coordenadas de mundo estables frente al origen flotante. El CPU actualiza tiempo/parámetros, no cada vértice.
3. Rotar normales coherentemente con la deformación. Integrar luz solar, ambiente nocturno, niebla y sombras del renderer; evitar copiar el aumento de brillo ligado al viento.
4. Si se habilita proyección de sombras, aplicar exactamente la misma deformación en material de profundidad y ampliar bounds para la máxima flexión. Empezar recibiendo sombras, sin proyectar cada fibra.
5. Reutilizar exclusiones de agua, caminos, desgaste y edificios. Distribución determinista por semilla, culling por chunk y LOD con histéresis. No modificar navegación ni entidades de simulación.
6. Bajo: pocas matas y viento analítico sin textura. Medio: campo vectorial compartido y densidad limitada. Lejano: material del suelo; no hojas diminutas que parpadeen.

No hacen falta compute shaders, teselación ni una pasada nueva para el viento básico. Sí hay coste de vértices, rasterización y potencialmente nuevos draws si se añade otra capa. Una textura de viento en vertex shader se consulta por vértice, no mágicamente una vez por instancia. Alpha clipping y doble cara aumentan riesgo de overdraw; preferir mallas opacas estilizadas cuando encajen.

## Presupuesto y prueba propuesta

Medidas existentes del juego, NO de RheaGrass: Intel UHD/ANGLE, 1280×720, Sabana cercana diurna, A original: 14.332 ms GPU en media y 10.719 ms en baja. CPU de envío 3.940/3.874 ms. Hay poco margen para una alfombra densa si se persiguen 60 fps. Fuente: `ground-pom/BENCHMARKS.md`; no sumar directamente CPU y GPU ni inferir FPS exactos.

Ejemplo aritmético, no benchmark: 10 000 hojas de Rhea equivalen a 70–80 mil triángulos por pasada antes de culling; las sombras vuelven a procesarlas. 192 matas de 240 triángulos son 46 080 triángulos. Igual número de triángulos no implica igual coste: cobertura de pantalla, overdraw, sombras y shader dominan según vista.

Prototipo recomendado en Sabana: comparar matas actuales estáticas, mismas matas con viento y dos densidades controladas. Misma semilla/cámara/hora/resolución, vistas cercana y normal, día/noche y movimiento; añadir prueba de origen flotante, streaming, construcción y pausado/reanudado. Medir GPU por timer queries, CPU de envío/actualización, p95, draw calls, triángulos y memoria; alternar bloques A/B/A para controlar deriva térmica.

Criterio propuesto, todavía no demostrado: viento sobre las mismas matas con coste GPU inferior al 5% y CPU adicional inferior a 0.2 ms; cualquier aumento de densidad debe justificar su coste visualmente. Descartar si hay raíces deslizantes, sombras desincronizadas, parpadeo o pérdida de legibilidad. Extender a Gran Río solo tras validar; parámetros de altura/flexión/densidad propios por bioma.

## Fuentes primarias

- [RheaGrass README](https://github.com/Ryan-Gee/RheaGrass/tree/bdf2dd4cbed87e496cc289c1bb20ee6245259a18)
- [Shader inspeccionado](https://github.com/Ryan-Gee/RheaGrass/blob/bdf2dd4cbed87e496cc289c1bb20ee6245259a18/Rhea/Assets/Resources/Shaders/GeometryGrass.shader)
- [Licencia](https://github.com/Ryan-Gee/RheaGrass/blob/bdf2dd4cbed87e496cc289c1bb20ee6245259a18/LICENSE)
- [WebGL2, Khronos](https://registry.khronos.org/webgl/specs/latest/2.0/)
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
