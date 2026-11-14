# Cierre de integración de suelos y cobertura WebGPU

Ámbito: soporte técnico del suelo de los seis biomas y cobertura continua de sabana, Gran Río y manglares. No es el cierre de todo B2 ni la aceptación de rendimiento o paridad artística global de C.

## Integrado en producto

- El perfil temporal normal crea la cobertura sin banderas de laboratorio. Los manglares utilizan islotes de Wild Engine (`mangroveNetwork:true`) y helechos; el material conserva viento, normales, recorte alfa y sombras. Sabana y Gran Río reutilizan sus módulos originales y atlas de suelo.
- Posiciones, pendientes, máscaras y agua proceden del terreno confirmado. Poblados, edificios y cultivos delimitan las exclusiones. El viento usa el reloj de presentación confirmado; no consulta ni altera la simulación.
- Terreno, bioma y ocupación se coordinan por secuencia y revisión. Una preparación cancelada, un vecino de agua sustituido o un propietario anterior no puede republicar cobertura obsoleta. Durante recuperación permanece retirada hasta terminar checkpoint y replay.
- Calidad y cámara cambian la cobertura mediante el propietario existente, sin otra capa de simulación. Recursos, cargas tardías y candidatos se liberan mediante la admisión compartida.

## Bloqueos corregidos durante el cierre

1. **Sombra del helecho contaminaba el siguiente objeto.** Three r180 ya hereda `positionNode` para sombras. Asignar además el mismo nodo a `castShadowPositionNode` sobrescribía dos veces el valor de restauración del material auxiliar. Se elimina esa asignación redundante; se conserva el recorte mediante `castShadowNode`. La deformación sigue presente en WGSL de sombra.
2. **Texturas cercanas invalidaban terreno preparado.** Un lote capturaba las plantillas de bioma y rechazaba cualquier sustitución posterior, aunque sus mallas y recursos siguieran retenidos. Ahora completa con sus recursos propios válidos y solicita la promoción posterior por la admisión habitual. Se conservan los controles de payload, supresión, propietario y revisión.
3. **Actualizaciones no espaciales reconstruían la hierba.** La barrera temporal interpretaba cambios de agua, crecimiento, salud o trabajo como nueva ocupación. Consulta ahora la huella que ya utiliza el generador: si no cambian posiciones, radios, footprints ni plantas vivas, no retira la cobertura. Los cambios de bioma/agua fuerzan la invalidación aunque no cambie la huella de edificios. Recuperación y cambios de terreno siguen manteniendo sus barreras incondicionales.
4. Se había corregido previamente la reconstrucción en ticks idénticos y la admisión de grupos de bioma vacíos. Esas garantías siguen cubiertas.

## Evidencia reproducible

Resultados del cierre: **282/282 pruebas automatizadas**, build de producción correcto y **12/12 casos gráficos**. Dispositivo informado por WebGPU: NVIDIA/Turing, sin adaptador software en el ensayo vivo. La compilación conserva únicamente el aviso habitual de bundles grandes; no se copiaron los recursos públicos en el build de verificación.

Se conservan [los resultados por bioma](ground-cover-biomes-20261107.json), [los dos arranques del ensayo vivo](ground-cover-live-20261107.json), [la escena tras construir](ground-cover-wall-20261107.png) y [la cobertura después de restaurar](ground-cover-restored-20261107.png). Ambos arranques terminan sin errores de Worker/recursos y sin cobertura pendiente, tras retirar y construir una muralla. El primero registra 71 generaciones de cobertura; el restaurado, 78. Antes de filtrar los cambios no espaciales se observaron 1.845 y 1.478. Los recorridos tienen distinta duración y streaming: estas cifras identifican reconstrucciones eliminadas, no constituyen una comparación de frametimes ni de velocidad.

`tools/experiments/audit_webgpu_temporal_ground.mjs` renderiza los seis biomas con día y noche, utilizando terreno WASM y la superficie de producto en Worker. Exige WebGPU, suelo texturizado, cobertura en los tres biomas correspondientes e imagen no vacía. Tres publicaciones idénticas conservan los UUID de geometría. El caso diurno de manglares crea además una superficie nueva, restaura un checkpoint, reproduce una frontera y verifica que la cobertura no reaparece antes de finalizar la recuperación.

Este ensayo aislado conserva ocupaciones, pero deja trabajadores en reposo y sin incursión: no es una campaña ni una comparación artística completa. Los chunks no contienen árboles en esta prueba para distinguir claramente suelo y cobertura.

`tools/experiments/audit_webgpu_live_ground.mjs` conecta el Worker autoritativo real con el Worker gráfico real, mediante los canales de producto, partiendo de la captura de manglares. Incluye instancias reales de bioma, cuatro chunks iniciales, cambios de calidad, cámara, retirada y construcción autorizadas de murallas, avance de simulación, guardado y arranque de un segundo runtime desde ese guardado. La configuración diurna inicial es una preparación de fixture; los comandos posteriores usan las reglas normales, sin forzar colocaciones rechazadas. No utiliza la interfaz completa ni pretende cubrir todo el combate.

Ejecución: Vite en 5200, Node 20 y Playwright con Edge. `QA_BASE_URL` permite otro origen; `PLAYWRIGHT_MODULE` permite resolver la instalación local de Playwright. Ambos runners guardan JSON y PNG en `.cache`. `QA_NORMAL_TRACE=1` en el runner vivo añade instrumentación mediante interceptación HTTP de la dependencia servida, sin modificar Three instalado; es solo para localizar advertencias.

## Límites y traspaso

- La expulsión visual opcional continúa denegada cuando no hay evidencia suficiente para readmitir exactamente el bioma. No existe una necesidad de activar esa optimización para migrar contenidos.
- El ensayo vivo detecta advertencias `normal` en sprites de partículas. La traza identifica geometría con `aCorner`, `iPos`, `iRect`, `iNext`, `iParams` e `iDirection`, propia de VFX; no son atributos perdidos del helecho. Queda localizado para B5/C, sin ocultarlo en el informe.
- El coste de reconstruir por cambios espaciales reales, el ajuste artístico global, las campañas largas y p95/p99 del conjunto pertenecen a C. Estas pruebas no demuestran una mejora de FPS ni certifican toda la recuperación tras pérdida física del dispositivo.
- Reversión: `VITE_WEBGPU_GRASS=false` desactiva cobertura; `VITE_WEBGPU_MANGROVE_FERN=false` conserva las hojas anteriores. No se han eliminado recursos de autoría ni la referencia WebGL.

El agente de contenidos puede continuar sobre esta integración: no queda un gate experimental que tenga que retirar ni un contrato de admisión/recuperación de hierba que deba inventar.
