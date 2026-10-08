# Traveling sobre finca densa: primera medición

Restauración del archivo histórico Gran Río/Suajili de cien noches con código
actual `8dcd77a0`, calidad media, Intel UHD, viewport1280×720 y buffer1600×900.
1257 plantas vivas (23700 registros), 34 trabajadores y un centro; simulación
pausada, cámara desplazada180m durante15s. Es una prueba de render/streaming,
no una nueva campaña de cien noches ni una medición de trabajadores en movimiento.

153 intervalos: p50 83,1ms, p95 216,2ms, p99 432,1ms, máximo648,6ms;
46 superan100ms. CPU render: p95 41ms, máximo646,1ms. Cinco renders exceden100ms
con incrementos de programas; esta correlación requiere instrumentación para
atribuir la causa. Quince chunks nuevos instalados en3–5,1ms; cero fallos,
fallbacks, errores o frames ocultos. Estado lógico serializado idéntico.

Timer queries asíncronas disponibles, sin disjoint ni pendientes: incluyen
world.render, no preparaciones asíncronas externas ni compositor. No comparación
A/B, mejora demostrada ni aceptación de estabilidad. Cuatro campañas CPU de
fondo permanecían activas; una sola escena gráfica QA estaba abierta.

El informe completo conserva frames, tareas largas, GPU y coordenadas. La captura
corresponde al final del recorrido, no demuestra ausencia de popping durante él.
Pendiente trazar compilación/primer dibujo y recursos nuevos, luego contrastar
candidatos con recorrido y estado iguales, sin reducir calidad para aprobar.

## Traza de diagnóstico

Mismo recorrido/estado con wrappers de diagnóstico: 176 intervalos, p95 182,8ms,
p99 299,4ms, máximo315,9ms y37 intervalos sobre100ms. No comparación causal
con la primera ejecución: instrumentación y cachés diferentes. Cinco llamadas
renderer.render toman102–293ms. Las otras subfases instrumentadas no explican
esos picos; compileAsync máximo36,9ms. La lista GL inicial no captura una llamada
que explique los principales picos. Se amplía el fixture para inspeccionar
compilación/reflexión y uploads en la siguiente ejecución. Estado idéntico,
cero errores, contexto liberado al terminar. Aún no es una solución aprobada.

## Consulta inicial de shaders localizada

Traza WebGL ampliada:174 intervalos, p95 166,3ms, p99 299,5ms, máximo349,3ms;
45 intervalos sobre100ms. Diagnóstico, no benchmark comparativo de mejora.
`gl.getProgramInfoLog` consume255,3ms en vegetación nativa con clipping,
189,7ms en material african-water,128,3ms en MeshDepthMaterial de FruitCrate
y225ms en BakedMaterial MeshPhysicalMaterial. Las llamadas están contenidas
en los renderBufferDirect lentos correspondientes, con tipo/nombre/clave
registrados en el informe. Esto identifica bloqueos concretos del primer uso;
no atribuye todos los intervalos lentos a una sola causa.

Three.js r180 consulta estos logs en onFirstUse, aun después de compilar.
El juego ya dispone de compileAsync/calientamiento y detección de errores:
no eliminar esa protección para ocultar el problema. Preparar y conservar
las variantes exactas que aparecen durante traveling requiere todavía diseño,
candidato, medición comparable y regresión visual. Sin cambios a producción,
sin errores, estado lógico idéntico y contexto liberado al terminar.

## Candidato QA: variantes residentes preparadas

Piloto con residentPrewarm, misma finca/recorrido/calidad y diagnóstico ampliado.
Espera modelos de actores pendientes y compila todas las variantes residentes
con los objetos/materiales originales; visibilidad/layers/frustum temporales se
restauran antes del await. Inicializa bindings, hace draw nativo de precarga con
viewport cero y espera fence. Invalida sombras tras el draw temporal. No modifica
partida/cámara ni desactiva shaderFailureGuard; no activa nada en producción.

Preparación adicional1432,1ms,81bindings y82programas.181intervalos: p95 149,8ms,
p99 199,5ms,máximo199,6ms y50sobre100ms. Ninguna consulta getProgramInfoLog sobre
100ms; renderer.render máximo27,4ms durante recorrido. Quince chunks nuevos,
estado idéntico, cero errores. La hipótesis específica de preparar variantes
residentes obtiene evidencia favorable, pero NO supera estabilidad global:
intervalos lentos persisten y su recuento no mejora. Piloto único/secuencia con
cachés, no ABBA, sin RAM/VRAM medida ni otras culturas/biomas. Necesita comparación
repetida, auditoría visual/recursos y diagnóstico restante antes de integración.
Tres pruebas dirigidas verifican restauración antes de await/fence, fallo de
shader propagado con flags restaurados y cancelación sin draw/fence posterior.

## Comparación A1/B1/B2/A2 sin trace

Cuatro contextos secuenciales nuevos, mismo código5ef8dcbb, finca/cámara/ruta,
calidad media ytimerGPU; ninguna otra escena QA activa ni cambios de fuente.
Cuatro campañas CPU de fondo permanecen activas; cachés globales/temperatura
no aisladas. B añade residentPrewarm; A usa preparación normal de producción.

| Brazo | p95 ms | p99 ms | Máximo ms | Frames >100ms |
|---|---:|---:|---:|---:|
| A1 |166,3|266,1|332,6|34|
| B1 |166,3|199,6|216,2|39|
| B2 |166,3|216,2|216,2|48|
| A2 |149,8|282,6|282,9|47|

B añade1166,2/1122,3ms de preparación. Todas las ejecuciones conservan estado,
finca y posiciones exactas de cámara/target, quince chunks nuevos y cero errores
ocultación/fallos. El candidato reduce el extremo largo en esta secuencia, pero
no demuestra mejora global de estabilidad: p95 no mejora y el recuento>100ms
no baja consistentemente. No activar en producción todavía. Investigar ritmo
GPU/tareas asíncronas restantes y validar recursos/visuales/cobertura antes de
integrar una solución final. Informes completos comprimidos y hashes en receipt.
