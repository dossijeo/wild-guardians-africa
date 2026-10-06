# Wild Guardians — Far Vegetation Impostor System

Especificación solicitada por el usuario el 5 de octubre de 2026. Estado: **prototipo aislado iniciado; primer atlas precalculado**. [Atlas de acacia y pruebas](qa/far-vegetation-atlas/README.md); [primer visor aislado de billboard y transición](qa/far-vegetation-transition/README.md). No acredita integración en gameplay ni éxito del sistema completo. Las distancias y resoluciones de ejemplo son experimentales.

## 1. Objetivo

Representar mediante impostores 2D los árboles más allá de la distancia normal de chunks. El objetivo principal es reducir vacío y popping del horizonte, no aumentar el rendimiento del render actual. Debe ampliarse la vegetación visible sin cargar GLB completos ni chunks de alta resolución.

Muy lejos e intermedio: impostor. Transición: impostor y modelo 3D. Cerca: modelo 3D. El cambio debe ser difícil de percibir durante el movimiento normal de cámara.

## 2. Separación de datos y representación

Separar árbol lógico/procedural, visual lejano y visual cercano. El árbol lejano solo necesita X/Z, Y aproximada, tipo, escala, orientación procedural e ID/seed. No necesita GLB, collider, física, sombras individuales complejas, comportamiento, animación, lógica de gameplay ni chunk completo.

La misma seed y reglas del mundo deben permitir conocer árboles de chunks todavía no cargados.

## 3. Assets precalculados

No generar texturas de árboles durante gameplay. Generar previamente un atlas por tipo con ocho vistas horizontales: 0°, 45°, 90°, 135°, 180°, 225°, 270° y 315°.

Todas las vistas deben compartir exactamente encuadre, escala, árbol centrado y coordenada vertical de la base del tronco. Fondo transparente, alpha conservado e iluminación neutra, sin luz direccional fuerte horneada.

Comenzar experimentalmente con 256 × 256 px por vista, sin fijarlo como resolución definitiva. Comparar posteriormente cuatro vistas si ocho no aportan una mejora perceptible a la distancia utilizada.

## 4. Billboard cilíndrico

Plano vertical que gira continuamente hacia la cámara solo alrededor de Y. Su dirección frontal es la dirección horizontal árbol → cámara, ignorando diferencias de altura. No inclinarlo al mirar desde arriba/abajo ni orientar el plano simplemente con la rotación procedural original.

## 5. Vista del atlas y orientación lógica

Conservar por árbol su rotación Y procedural. Calcular `relativeAngle = cameraAngleAroundTree - treeWorldRotation`, normalizado a 0–360°. Para ocho vistas, selección discreta: `viewIndex = round(relativeAngle / 45°) mod 8`.

Dos árboles del mismo tipo con rotaciones diferentes pueden mostrar caras diferentes desde una misma cámara. Verificar la convención angular y ausencia de inversiones.

## 6. Cambio angular suave

Preferir interpolar las dos vistas adyacentes para evitar popping angular. A 30° relativos: aproximadamente 33 % de la vista 0° y 67 % de la vista 45°, mediante mezcla de muestras del atlas.

Comparar experimentalmente ocho vistas discretas frente a interpoladas si el coste/complejidad resulta excesivo. No asumir que la mezcla es necesaria si el cambio no se percibe a las distancias reales.

## 7. Iluminación global

No hornear variantes mañana/mediodía/tarde/noche. El atlas neutro debe recibir como mínimo `finalColor = impostorColor × globalLighting`, incluyendo color/intensidad día-noche, tinte ambiental, fog/perspectiva atmosférica y filtros globales relevantes del bioma.

Debe seguir aproximadamente el oscurecimiento/azulado nocturno de los modelos. Se prioriza coherencia perceptual sobre equivalencia física exacta.

## 8. Normales opcionales

Primera prueba: RGB + alpha + iluminación global simplificada. No implementar normal maps inicialmente. Solo si la transición resulta demasiado plana, experimentar con normales precalculadas, aproximadas o iluminación hemisférica simple.

## 9. Rangos configurables

Exponer parámetros equivalentes a `MODEL_FULL_DISTANCE`, `TRANSITION_START`, `TRANSITION_END` e `IMPOSTOR_MAX_DISTANCE`; no fijar valores definitivos en código.

Ejemplo experimental: 0–250 m modelo; 250–300 m transición; 300–1000+ m impostor; al extremo lejano desaparición progresiva mediante fog. Ajustar a la escala real del mundo.

## 10. Transición bidireccional

Nunca sustituir instantáneamente impostor OFF → modelo ON. Mantener una banda de transición que funcione al acercarse y alejarse. Ejemplo: 300 m impostor 100 % / modelo 0 %; 275 m ambos 50 %; 250 m impostor 0 % / modelo 100 %.

## 11. Dithering de LOD

Preferir crossfade con dithering/screen-door frente a transparencia alpha tradicional. Usar `lodFade` entre 0 y 1: modelo `1 - transitionFactor`, impostor `transitionFactor`.

Descartar píxeles con patrón estable en pantalla o mundo, evitando parpadeo temporal evidente, problemas de orden y doble imagen. Conservar materiales opacos/alpha-tested y reutilizar un mecanismo equivalente del motor si existe.

## 12. Coincidencia espacial

Durante la transición compartir exactamente base, altura, escala y orientación lógica, con dimensiones visuales aproximadamente iguales. El billboard usa pivote inferior centrado (`bottom-center`): la base coincide con el contacto del tronco con el terreno. No centrarlo verticalmente sobre la posición del árbol ni permitir que flote/se desplace.

## 13. Escala derivada del modelo

Guardar `impostorWidth` e `impostorHeight` por especie según dimensiones reales del modelo y multiplicarlas por `treeProceduralScale`. Una escala procedural 1,2 debe ampliar modelo e impostor en la misma proporción.

## 14. Chunk cargando detrás del impostor

La visual lejana es independiente del estado de carga del chunk real. Al acercarse, cargar/generar el chunk y preparar el modelo equivalente; entonces efectuar crossfade y retirar el impostor cuando termine.

No quitarlo por el simple hecho de terminar la carga del chunk. Si el modelo tarda, mantener temporalmente la representación simplificada para evitar vacío.

## 15. Correspondencia determinista

Evitar que el impostor se sustituya por un árbol distinto/desplazado. Compartir ID, posición, especie, escala y rotación entre ambas representaciones. ID propuesto: `hash(worldSeed, chunkCoordinate, localTreeIndex)`.

Solo cambia la representación, no el árbol lógico.

## 16. Terreno sin generar

Obtener Y directamente de la función procedural de altura, por ejemplo `sampleTerrainHeight(worldX, worldZ)`, sin construir el chunk completo. Consultar altura, bioma, densidad y tipo de árbol con datos ligeros.

## 17. Densidad lejana determinista

Exponer `farVegetationDensityMultiplier`: 1,0 todos; 0,5 aproximadamente la mitad; 0,25 aproximadamente una cuarta parte. Seleccionar mediante seed/hash estable, nunca aleatoriamente cada frame.

Lejos importan siluetas, densidad aparente y masas vegetales. No es obligatorio representar el 100 % ni exigir correspondencia perfecta de todos los árboles; los seleccionados que lleguen a transición sí deben coincidir con árboles reales.

## 18. Perspectiva atmosférica

Mezclar progresivamente el color del árbol con el horizonte según distancia/fog. Reducir contraste, aproximar al cielo/horizonte y reducir saturación si encaja con el shader actual. Ocultar resolución limitada, planaridad, cambios angulares y simplificación de iluminación.

## 19. Extremo lejano progresivo

No cortar abruptamente en `IMPOSTOR_MAX_DISTANCE`. Desvanecer en una banda A–B hacia la niebla del horizonte, evitando un borde circular visible de vegetación.

## 20. Muchos impostores

Preferir instancing/batching, con material/atlas por especie o conjunto, frente a renderables costosos independientes por árbol. Datos aproximados por instancia: posición, escala, rotación lógica, índice de atlas/especie, fade y seed/variación opcional.

Investigar billboard y selección angular en shader para reducir trabajo CPU. Medir CPU, GPU, RAM y tamaño distribuido; el horizonte adicional debe tener un coste pequeño.

## 21. Sombras

Inicialmente los impostores no proyectan sombras dinámicas. El modelo cercano recupera las suyas. Si la aparición resulta visible, introducirlas progresivamente con el modelo. No generar shadow maps para miles de árboles lejanos.

## 22. Primera prueba aislada y validación

Un único árbol de Sabana, atlas de ocho vistas, varios ejemplares repetidos, cámara móvil, billboard Y, selección angular, transición 3D/impostor, luz global y fog. No integrar inmediatamente todos los biomas.

- **A — rotación:** órbita lenta; plano orientado a cámara, orientación procedural conservada, vistas correctas, sin inversión izquierda/derecha.
- **B — aproximación:** acercar y alejar; sin saltos de escala/altura/silueta y con crossfade estable.
- **C — movimiento lateral:** pasar junto a varios árboles para detectar planaridad.
- **D — luz:** amanecer, mediodía, atardecer y noche; modelos e impostores pertenecen perceptualmente a la misma escena.
- **E — horizonte:** cientos/miles de impostores más allá de los chunks actuales; comprobar que el mundo deja de parecer cortado.

## 23. Criterios de éxito

1. En gameplay normal no se distingue fácilmente el límite 3D/impostor.
2. Acercarse no provoca popping evidente al sustituirlo por el modelo.
3. Orbitar no revela una lámina evidente.
4. El horizonte conserva vegetación aunque los chunks reales no estén cargados.
5. CPU/GPU/RAM permiten ampliar sustancialmente la distancia visual con coste suficientemente pequeño.
6. No aumenta significativamente el tamaño final del juego.

Registrar pruebas visuales y medidas antes de declarar éxito. La integración general depende de esa validación.

## 24. Prioridad visual

Priorizar silueta, tamaño, posición, color, densidad y coherencia atmosférica: que el jugador no perciba la sustitución. No perseguir equivalencia perfecta ni detalles que ocupan pocos píxeles.

## 25. Segunda fase condicionada

Solo tras validar árboles, estudiar arbustos, vegetación característica, rocas grandes, edificios lejanos, formaciones geológicas, atlas multiespecie, normales, LOD ultralejano o terreno simplificado.

El primer objetivo sigue siendo ocultar visualmente el borde de generación de chunks mediante árboles impostores, sin introducir un coste importante.


Avance experimental: [horizonte de mil acacias adicionales medido](qa/far-vegetation-horizon/README.md), ocho lotes nativos, cinco pruebas dirigidas y selección cercana sin reconstrucción con cámara quieta. Coste incremental GPU aproximado de 0,49 ms en este visor; todavía fuera de gameplay, sin acreditar móvil, RAM o integración procedural/iluminación real.


Avance experimental de iluminación: [modelo con material real y atlas con grading artístico compartido](qa/far-vegetation-lighting/README.md), cuatro fases del reloj, comparación a cámara fija y ocho lotes GPU. Persisten diferencias de contraste/detalle y el coste requiere más evaluación; no se activa en gameplay ni acredita la transición final.
