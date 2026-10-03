# Prioridades de rendimiento

Sugerencias del usuario del 3 de octubre de 2026. Se medirán con la misma cámara,
calidad y dispositivo, conservando diferencias visuales y tiempos CPU/GPU por
separado. No se atribuye una mejora de FPS al recuento de trabajo evitado.

1. **Invalidación de paisaje (implementada):** separar entidades y supresiones de
   props del streaming del suelo. Conservar navegación, guardado, agua de assets,
   contactos, LOD, ocultación y sombras. Plantar y lanzar magia no deben retirar
   todos los chunks ni forzar el horizonte.
2. **Caras (props auditados):** [informe conservador](qa-face-sides.md), 120 props/360 LOD;
   sin candidato cerrado acreditado en todos sus LOD, materiales conservados.
   Pendiente prueba visual y GPU por prop/LOD y otras categorias.
    experimentar por categorías con FrontSide en geometría cerrada;
   mantener hojas, planos y superficies abiertas. Revisar shadowSide y edificios
   dañados con cámara girada; comparar GPU e imágenes.
3. **Caché de sombras (implementada):** [evidencia y límites](qa-shadow-cache.md).
   Invalida por poses, crecimiento/viento, geometría, luz, contexto y materiales.
   Separar casters estáticos/dinámicos queda como mejora posterior.
4. **Coste del shader (diagnóstico medido):** [evidencia y límites](qa-fine-noise.md). diagnóstico de ruido fino desactivado conservando bandas,
   paleta y contornos. Evaluar ruido de textura/receta barata/calidad/distancia
   con comparación visual. [Lectura HDR en extremos día/noche implementada](qa-hdr-endpoints.md).
   PCF compartido ya implementado; no duplicar ese trabajo.
5. **Bounds y selección por luz (implementados):** [evidencia de las cinco culturas](qa-village-bounds.md);
   [envolvente conservadora de centros y colapso](qa-center-bounds.md) y
   [selección de chunks contra la luz](qa-light-volume.md), conservando casters
   fuera de cámara que siguen dentro del volumen de sombra.
6. **Cultivos (subidas implementadas):** matrices estables, atributos de crecimiento/morph
   separados, subidas únicamente de rangos cambiados. El viento usa reloj, sin
   reenviar matrices. Registro de materiales/agua implementado: [evidencia y límites](qa-material-registry.md).
   [Caché de obstrucciones implementada](qa-obstruction-cache.md), conservando fades
   y reempaquetado al cambiar LOD; otros recorridos CPU siguen pendientes.
7. **Profundidad VFX (ampliación opaca implementada):** [rutas nativas y medición](qa-standard-depth.md),
   además de [cultivos, exterior DEST y sólidos VFX](qa-depth-capture.md).
   Terreno, horizonte y actores opacos usan recetas de profundidad conocidas.
   Alpha sin ruta acreditada conserva su shader original tras detectar diferencias
   en manglares; interiores/ceniza siguen pendientes. No explica una vista sin efectos.
8. **Resolución (diagnóstico medido y selector implementado):** [DPR 1 manteniendo calidad media](qa-resolution.md),
   36 % menos de píxeles; [selector persistente separado del HUD](qa-resolution-settings.md).
   Intercambia nitidez por rendimiento; variación GPU y alcance preservados.

Origen relativo y cambios 1/6 publicados; [alcance y evidencia de acciones](qa-performance-actions.md). Estas prioridades no
sustituyen la auditoría funcional completa del Plan Maestro ni acreditan móvil.

## Revisión integrada del 3 de octubre

Sobre `79f99c5`, las 33 pruebas dirigidas de props residentes, subidas de cultivos,
caché de sombras, calidad, profundidad y composición African Toon pasan sin
fallos ni omisiones. Esta repetición comprueba regresiones; no añade una nueva
medición GPU ni demuestra una mejora de FPS.

La evidencia de navegador ya registrada distingue los resultados:

| Prioridad | Resultado comprobado | Límite |
| --- | --- | --- |
| Paisaje | Retirar un prop conserva 25/25 terrenos y reemplaza un slot | No mide el tiempo de cada acción de campaña |
| Sombras | 1 pasada y 209 reutilizaciones frente a 210 pasadas en escena detenida | Viento y actores en movimiento invalidan el mapa |
| Ruido fino | GPU media 44,40 → 39,11 ms en el diagnóstico | Cambia el detalle; no se desactiva por defecto |
| Cultivos | 210 frames sin subir matrices ni crecimiento con reloj fijo | No elimina todos los recorridos CPU de plantas |
| Profundidad VFX | Captura media 29,07 → 21,76 ms; cero diferencias en las seis vistas finales | Alpha sin receta acreditada conserva la pasada completa |
| Resolución | DPR 1 conserva HUD y reduce de 1600×900 a 1280×720 | Pierde nitidez del mundo; no promete FPS proporcionales |

Los siguientes experimentos pendientes son una receta de ruido más barata con
comparación visual, caras por categoría/LOD y profundidad de interiores/ceniza.
La separación de sombras estáticas/dinámicas requiere una prueba independiente.
No se convierten estos diagnósticos en cambios visuales globales sin validarlos.

## Finca grande: medición de QA-158

Sobre `fc94ba9`, la [prueba de finca grande](qa-large-farm.md) coloca 600 cultivos,
24 defensas y dos centros, con un poblado a más de cuatro kilómetros del origen.
Tres ciclos de streaming y una recarga completa conservan exactamente el estado,
las colisiones y posiciones. Los recursos registrados regresan a 111 geometrías
y 21 texturas en las cinco series de finca; no se afirma estabilidad indefinida.

Las 300 muestras estáticas en media, framebuffer 1600×900, dan intervalos medios
de 59,98–71,21 ms y CPU render de 8,64–12,38 ms. Son intervalos reales de navegador
y CPU síncrona, no tiempo GPU ni una prueba A/B. La escena sigue siendo pesada;
el cierre funcional de QA-158 no cierra las optimizaciones pendientes.

Durante la revisión se corrigió la retirada de lotes: InstancedMesh.dispose
libera los buffers propios de instancias al crecer la capacidad. La geometría
y los materiales ya se liberaban. La prueba cubre los 40 modelos y 32 bridges;
no atribuye a este cambio una mejora de FPS ni bytes GPU medidos.

## Comprobación sobre la implementación actual

Sobre `0db52e8` pasan **51/51 pruebas dirigidas**, cero fallos/omisiones,
1.074,6846 ms: props residentes, buffers de cultivos, sombras, bounds del
poblado, registros de materiales, obstrucciones, ruido, HDR, profundidad,
calidad y composición Toon. [Salida completa](qa/performance-actions/integrated-current.txt).
Incluye las modificaciones posteriores de apuntado de magia y expiración
del Escudo; es una comprobación de regresión, no una nueva medición GPU.

La [CI de esa base](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37110777079)
aprueba 787/787 pruebas y el paquete web. Los experimentos pendientes
indicados arriba conservan su estado: no quedan acreditados por esta suite.

## Regresión tras los cambios de gameplay y guardado

Sobre `7cd4481` pasan **69/69 pruebas dirigidas**, cero fallos, cancelaciones
u omisiones, 1.025,3525 ms. [Salida completa](qa/performance-actions/integrated-7cd4481.txt).
Se comprueban props residentes, subidas de cultivos, caché y cámara de sombras,
bounds de las cinco culturas, registro de materiales, obstrucciones, diagnóstico
de ruido, extremos HDR, profundidad, calidad y composición Toon. Se incluyen
también el analizador conservador de caras y la resolución independiente del HUD.

Esta revisión confirma que las modificaciones posteriores de eventos agrícolas,
autosaves, contratos y cosechas guardadas no introducen regresiones en esas
pruebas. No es una nueva medición de FPS, GPU ni equivalencia visual en navegador.
Las pruebas y mediciones pendientes de las ocho prioridades permanecen abiertas.

## Revisión de las sugerencias recibidas sobre `4cf2678`

Se contrastaron de nuevo los ocho puntos con la implementación actual. Las
acciones de herramientas, murallas y fundación usan `syncResidentProps()`;
no llaman a `syncChunks(true)`. El cambio conserva las supresiones de navegación
y actualiza únicamente los slots residentes afectados.

Pasan **58/58 pruebas dirigidas**, cero fallos, cancelaciones u omisiones,
1.045,2277 ms: props residentes, buffers de cultivos, caché y cámara de sombras,
bounds de poblados, materiales, obstrucciones, ruido, Toon, profundidad,
calidad, análisis de caras y resolución del mundo.
[Salida completa](qa/performance-actions/integrated-4cf2678.txt).
Esta selección no incluye todas las pruebas de la revisión anterior de 69 casos;
no es una medición nueva de FPS ni una comparación visual nueva.

Se mantienen pendientes los experimentos de caras por categoría y LOD, receta
barata de ruido y profundidad de interiores/ceniza. No se desactiva por defecto
el ruido ni se sustituyen globalmente materiales por FrontSide. La separación
entre sombras estáticas y dinámicas sigue siendo una mejora posterior.

## Interior y ceniza: ensayo con salvaguarda

Sobre `0a499fc`, `bc6811b` incorpora una ruta experimental de profundidad para
interior y ceniza, desactivada por defecto. [Evidencia y contraejemplos](qa-auxiliary-depth.md):
84 comparaciones en cuatro culturas coinciden, pero la ampliación a Etíope
y giros adicionales presenta diferencias pequeñas. La conservación del orden
no resuelve todos los casos; ese cambio no se aplica al renderer de producción.
Pasan 47 pruebas dirigidas, build y paquete. La ruta normal conserva cero
diferencias en los seis daños comprobados. Esta prioridad sigue pendiente;
no se acredita un ahorro GPU de la ampliación ni se activa en partida.

## Regresión y expansión sobre `7ff5398`

Las sugerencias siguen registradas con sus límites anteriores. Pasan **54/54
pruebas dirigidas**, cero fallos u omisiones, 815,7999 ms: props residentes,
subidas de cultivos, caché/cámara de sombras, bounds de poblados, registros,
obstrucciones, ruido, Toon, profundidad, calidad y resolución.
[Salida completa](qa/performance-actions/integrated-expansion.txt). Esta selección
no repite todos los analizadores anteriores ni añade medición GPU o visual.

La [expansión nativa](qa-village-expansion.md) añade descarte conservador por cajas
a polígonos y cotas inferiores para buscar la ruta más corta al poblado. El ensayo
de 100 poblados registra 99 rutas reales; no se afirma una mejora temporal ni de FPS.
Los experimentos pendientes de caras, ruido y profundidad conservan su estado.

## Regresión sobre `d89b184`

Pasan **61/61 pruebas dirigidas**, cero fallos, cancelaciones u omisiones,
1.998,1384 ms. [Salida completa](qa/performance-actions/integrated-d89b184.txt).
La selección cubre props residentes, subidas de cultivos, caché/cámara de sombras,
bounds del poblado, registros de materiales, obstrucciones, ruido, extremos HDR,
Toon, profundidad, calidad, análisis de caras y resolución independiente del HUD.
Las acciones actuales conservan `syncResidentProps()` sin regenerar el suelo.

Es una comprobación de regresiones tras los cambios de audio y tipografía.
No añade una medición GPU, FPS ni una comparación visual. Los experimentos
de caras por categoría/LOD, ruido fino más barato, profundidad de interiores/ceniza
y separación de sombras estáticas/dinámicas conservan los límites documentados.

## Comprobación de las ocho sugerencias sobre `257bf0c`

Se contrastaron las sugerencias con el código actual y pasan **61/61 pruebas
dirigidas**, cero fallos, cancelaciones u omisiones, 1.395,7136 ms.
[Salida completa](qa/performance-actions/integrated-257bf0c.txt). La selección
cubre las mismas quince suites de la revisión de `d89b184`, tras los cambios
de música, aislamiento de biblioteca y reproducción de campañas.

No se han vuelto a implementar correcciones que ya estaban presentes ni se
atribuyen nuevos ahorros GPU a esta comprobación. Continúan pendientes las
comparaciones visuales/GPU de caras por categoría y LOD, una receta de ruido
más barata, profundidad de interiores/ceniza y separación de sombras estáticas
y dinámicas. La resolución sigue siendo un ajuste explícito de nitidez.


## Materiales del lab V4.1.10.3

La integración del nuevo lab sustituye la receta del suelo y la iluminación de props/poblados. Los ensayos anteriores de ruido fino y GPU no cuantifican esta versión. Se conservan los mapas nativos y el parallax cercano para mantener su apariencia; cualquier variante más barata necesita una nueva comparación visual y GPU. El paquete elimina únicamente los seis recursos del poblado demostrativo que no usa el juego (21.075.266 bytes), sin alterar los assets de las cinco culturas.
