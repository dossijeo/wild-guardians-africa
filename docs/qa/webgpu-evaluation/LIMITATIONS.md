# Alcance y límites de la evidencia

Este experimento contiene prototipos ejecutables y capturas del renderizador real, pero **no constituye una migración completa ni una validación de campañas**. La decisión debe apoyarse en los resultados del protocolo final, distinguiendo una ventaja del backend en estos diagnósticos de una ventaja demostrada para Wild Guardians.

## Qué representan las escenas

| Escena | Evidencia que permite obtener | Qué falta respecto a la petición completa |
| --- | --- | --- |
| A: cobertura de Sabana y Gran Río | Geometría e instancias seleccionadas por los helpers originales; comparación del material/viento y del envío de los mismos buffers | La selección está congelada. El movimiento de cámara no ejecuta culling, LOD ni streaming de producción. La escena aislada no contiene terreno, objetos ni visibilidad de sombras |
| B: terreno | Terreno procedural, texturas Grass Medium 01, normales, POM acotado, viento, día/noche y sombras en una ruta TSL común | No reproduce íntegramente AfricanToon, máscaras del mundo, agua, contactos, horizonte ni cache de sombras. No demuestra paridad con el suelo del juego original |
| C: escena compleja | Assets reales, instancing, esqueletos, animación, sombras y cambios deterministas de posiciones en un conjunto complejo | Es una disposición de estrés construida para la prueba, no una partida avanzada guardada. No contiene todos los materiales, efectos, reglas visuales, LOD o sistemas del renderer completo |

El snapshot de Sabana procede del arranque de campaña. El de Gran Río procede del fixture AfricanToon case 6 con WorldScene real, tras bloquearse el lanzamiento mediante el menú en el harness. Ambos conservan semilla 712, cámara indicada y selección original de su helper; sus metadatos identifican la procedencia. **No deben interpretarse como dos capturas de una misma campaña ni compararse sus poblaciones entre biomas como si solo cambiara el backend.**

Las imágenes `original-savanna.png` y `original-river.png` documentan la escena de origen. Las comparaciones entre backends deben utilizar las capturas de los prototipos equivalentes; no comparar directamente la imagen completa original con el recorte funcional de hierba y atribuir la diferencia de coste a WebGPU.

## Compute

`compute-probe.js` demuestra selección por distancia, compactación de IDs y escritura de argumentos indirectos. Es una prueba aislada de capacidad y coste, **no una integración del selector de hierba del juego**: omite frustum, ocupación, chunks, LOD, viento y dibujo de producción.

La reducción de CPU observada en esa operación, si existe, no demuestra todavía menor frametime del juego. Tampoco un resultado negativo prueba que toda estrategia compute sea inviable. Faltaría conectar buffers persistentes, selección y dibujo, conservar exactamente la población visible y medir movimiento/streaming sin readbacks de auditoría dentro del trabajo normal.

## Temporizadores y contadores

- El protocolo final usa una consulta externa WebGL alrededor del render completo. WebGPU suma duraciones de sus pasadas. **Los ámbitos no son estrictamente idénticos**: la suma de pasadas puede excluir huecos, transferencias y trabajo entre pasadas que sí cae dentro de la envolvente GL. Diferencias pequeñas no deben atribuirse automáticamente a una API.
- Las muestras GPU serializadas esperan el resultado de la consulta; no representan latencia de presentación, tiempo de cola ni FPS sostenidos. La secuencia RAF se mide aparte, sin readback.
- La CPU de envío mide `renderer.render`; no incluye por sí sola toda la preparación. `updateMs` corresponde a la actualización del fixture durante RAF, no a Wild Engine, navegación, economía o una campaña activa.
- Los intervalos RAF describen el tiempo desde el frame anterior y están sujetos a presentación, navegador y planificación del sistema. No son un temporizador GPU.
- Draw calls y triángulos deben coincidir en cada comparación aplicable. Igualdad de contadores es necesaria, pero no demuestra igualdad de iluminación, materiales, sombras o calidad.
- Las capturas estáticas permiten verificar una pose. No prueban por sí solas paridad temporal durante todo el recorrido ni ausencia de artefactos.
- Resultados de carpetas `pilot-*` y `*-smoke` pertenecen a diagnósticos de implementación. No deben mezclarse con el protocolo final para escoger los tiempos más favorables.

## Streaming, memoria y recursos

La escena compleja relocaliza chunks ya cargados. Esto ejercita matrices, frustum y envío, pero **no mide latencia de generación, Worker, IO, decodificación, subida de nuevos recursos ni adopción del streaming de producción**.

El heap JavaScript y los contadores `renderer.info.memory` no son memoria GPU medida. Los bytes estimados de buffers/texturas describen payloads nominales; no incluyen necesariamente padding, copias de staging, caches, compilación o asignaciones del driver. Una diferencia de contadores internos entre renderers tampoco demuestra ahorro de VRAM.

Disponer de métodos `dispose` y cerrar páginas no sustituye una prueba prolongada de cargar/descargar/recrear recursos. Sin esa prueba no se afirma ausencia de fugas, estabilidad ante pérdida de dispositivo ni correcta recuperación de todas las campañas.

## Compatibilidad y coste de migración

La disponibilidad en el Intel UHD y navegador del experimento no acredita compatibilidad con todos los dispositivos objetivo. El fallback de WebGPURenderer debe evaluarse con las operaciones realmente usadas; compute con compactación atómica no es una alternativa equivalente en WebGL2. Véanse [COMPATIBILITY.md](COMPATIBILITY.md) y [THREE-R180.md](THREE-R180.md).

La [auditoría del renderer](RENDERER-AUDIT.md) identifica dependencias de `onBeforeCompile`, ShaderChunk, sombras internas de WebGLRenderer, profundidad packed de destrucción, precarga y lifecycle GL. Su estimación orientativa es **4–8 semanas-persona**, con incertidumbre alta y aproximadamente **25–40 módulos de integración** afectados; no es una promesa de calendario ni de viabilidad. La validación de seis biomas, efectos, campañas, perfiles modestos y recursos forma parte del coste.

## Interpretación de la decisión

Estos límites impiden presentar una mejora de microprueba como justificación suficiente para reescribir todo el renderer. Una eventual recomendación **CONSERVAR WEBGL2** significa que no se ha demostrado una ventaja suficiente para asumir el coste y riesgo de migración con esta evidencia; no significa que WebGPU carezca de potencial.

No se declara aquí validada una migración, paridad artística completa, rendimiento superior de campañas, compatibilidad universal ni ausencia de fugas. Si el informe recomienda continuar con WebGPU, deberá identificar qué beneficio está probado, qué condiciones siguen pendientes y cómo se cerrarán antes de considerar terminada la migración.
