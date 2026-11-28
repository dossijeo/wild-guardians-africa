# Descanso tras el paseo sobre el actor y Surface originales

Continúa [la fuente actual tipada](e-r3-native-idle-arrival-data-20261116.md) dentro de A6. El consumidor original admite el descanso 21 desde el extremo ejecutado 22, conservando la identidad del actor y sus recursos sanos. Los cierres A6/e-R3/e-R4/f-R4/A/B/C permanecen abiertos.

## Investigación aplicada

Se leyó el código real de [Three r180 Pipelines](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js), [RenderObjects](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObjects.js) y [Babylon.js 8.37.0 ThinEngine.createEffect](https://github.com/BabylonJS/Babylon.js/blob/8.37.0/packages/dev/core/src/Engines/thinEngine.ts). Three comparte programas por código WGSL exacto y los elimina al desaparecer su último usuario; Babylon separa la identidad compilada de cada uso mediante código/defines y referencias. Una captura de código exacto confirmó que volver del paseo recreaba 12 módulos ya compilados y 8 pipelines.

Se adapta la duración del trabajo compilado al propietario existente: al retirar un ciclo 21 después del fence, el binding restaura materiales/raycast, se desactiva, desregistra réplicas y se desliga del movimiento. El roster conserva una sola liberación de sus materiales compilados por actor residente; reemplazar ese conjunto libera el anterior y retirar el actor lo libera todo. No conserva un binding activo ni concede permiso de dibujo al programa retirado. No añade una caché global, cambia claves internas de Three ni introduce dependencias. El material sigue registrado en el propietario de recursos existente.

## Consumidor y relevo

Terreno, kernel estacionario, roster y adopción Surface leen la misma unión de fuente 20/22. La pose de soporte y el transform corresponden al extremo real del paseo, no a la posición inicial 20. El roster exige WALK canónico y su asociación 22 exacta; preparar, cancelar y revalidar conservan actor, geometrías, fases y autoridad anterior. La nueva publicación refleja REST sólo después de adquirir 21. Liberar una asociación vieja no elimina el sucesor.

La textura de datos de paseo lleva una etiqueta diagnóstica de actor/decisión; la captura de hardware identifica su propietario exacto. Se retira tras el fence mientras geometrías y bancos conservan sus IDs. Las restauraciones de material posteriores afectan exclusivamente a réplicas ocultas del programa anterior; la prueba rechaza cambios en propietarios visibles y cualquier creación después de READY.

## Validación

**1383/1383 pruebas en 120 archivos**, 724621.5824 ms. Incluye 19 casos de fuente/puertos del incremento anterior, 8 nuevos del consumidor actual para los cuatro perfiles y una prueba de propiedad que repite ocho retiros, comprueba desactivación, cancelación, rechazo del propietario y liberación final sin acumulación. Build de producto correcto en **45.44 s**. No se reconstruye WASM: los 18 inputs/artefactos nativos, 16 archivos locales protegidos y helper pthread original permanecen exactos. [Comandos, inputs y hashes](performance/native-idle-arrival-consumer-validation-20261116.json).

La [prueba GPU del relevo](performance/native-idle-arrival-consumer-gpu-20261116.json), NVIDIA/Turing, 640x360, muy_baja, nueve chunks y dos actores originales, pasa 20→21→22→21 con Game, puertos, Surface y Host reales. Conserva los **533 IDs de geometría/bancos** de esta escena, ambos roots/rigs y las instancias. No crea módulos de shader, pipelines, layouts de pipeline ni texturas al preparar el descanso final; sí crea **36 buffers, 16 bind groups y 16 layouts de grupo**. El Host realiza 21 copias de uniformes (4816 bytes) y 21 copias de bindings durante esa preparación, sin copiar buffers estáticos ni texturas. Después de READY no crea recursos ni incrementa ninguna copia. Ambos actores siguen dibujándose durante los bloques de 1800 ms (53 dibujos en el bloque final); picking devuelve sus IDs por la vía ordinaria. Retira exactamente la textura 22 obsoleta y drena antes de cerrar la autoridad.

Se inspeccionaron las capturas de [paseo](performance/native-idle-arrival-consumer-stroll-20261116.png) y [descanso posterior](performance/native-idle-arrival-consumer-rest-20261116.png), con terreno, actores y sombras visibles. Esta escena no constituye aceptación del juego completo ni demuestra por sí sola ausencia absoluta de tirones.

## Siguiente punto pendiente

Completar tarea/Home desde el cuerpo y pose actuales, restauración móvil y cohort/producer ordinarios; después aproximación/anclas/bloqueos y restantes clases/finales/puertas, nacimiento/sustitución en vivo y recuperación incremental integral de 3123 recursos. La prueba usa proyectores Game auténticos con un pump controlado, sin activar todavía el tick ordinario de esa cohorte. La preparación aún crea buffers/bind groups y queda declarada como coste. No se inicia D.
