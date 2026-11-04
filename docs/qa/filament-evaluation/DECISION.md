# CONSERVAR THREE.JS + WEBGL2

La prueba **sí demuestra Filament WASM + WebGPU real en navegador**, pero no
demuestra la ventaja necesaria para sustituir el renderizador de Wild Guardians.
Se detiene la migración. El renderizador principal, Wild Engine y la lógica del
juego permanecen intactos. No se modifica ni se fusiona `main` ni PR #159.

## Evidencia experimental

Filament oficial v1.78.0, commit `c1dc4e444784850d6dc891a1fb38747c30b85463`,
se ejecutó sobre Intel UHD Gen12LP, Chrome 155, mediante el paquete web oficial,
sin fork. La prueba mínima carga el GLB original de Kofi (62 entidades, 12
animaciones), lo sitúa sobre un plano, usa luz direccional y cámara móvil y
ejecuta el animador nativo. Termina 120 renders y 120 envíos WebGPU sin errores.
[Captura real](official-web/browser.png), [registro](official-web/result.json).

El benchmark conserva **48 bloques válidos**, 14.400 callbacks RAF medidos y
2.880 muestras GPU válidas, además del calentamiento. Dos repeticiones por
motor, día/noche y orden alternado. Se separan backend/material equivalente y
soluciones con instancing nativo. [Protocolo](PROTOCOL.md),
[resultados completos](RESULTS.md), [datos resumidos](summary.json).

| Escena | Three/WebGL2: intervalo medio por repetición | Filament/WebGPU | Resultado |
| --- | ---: | ---: | --- |
| A estática, día | 26,22–29,54 ms | 32,18–41,29 ms | Filament empeora 31,8% al comparar las medias de repeticiones. |
| A estática, noche | 24,56–32,92 ms | 34,77–39,20 ms | Empeora 28,7%. |
| B dinámica, día | 35,47–46,62 ms | 53,28–64,57 ms | Empeora 43,6%. |
| B dinámica, noche | 37,08–44,51 ms | 62,72–73,71 ms | Empeora 67,2%. |
| C Sabana nativa, densidades 0,5 / 1 / 2 | ≈16,63 ms | 16,63–16,74 ms | Cerca de 60 FPS ambos; no hay ventaja de cadencia. |
| C expandida, mismo shader/trabajo, densidad 1 | ≈16,63 ms | 16,63–17,14 ms | Tampoco aparece una mejora relevante. |

Los porcentajes no son garantías universales: hay variación del equipo
compartido y las unidades de iluminación/filtrado PBR de A/B difieren. A/B no
son AfricanToon ni una campaña completa. Estas limitaciones impiden declarar
una migración favorable; no convierten las pérdidas observadas en una ventaja.

Los registros incluyen P50/P95/P99, CPU de preparación y envío, GPU, FPS,
draw calls, triángulos, JS/WASM, recursos GPU estimados, carga y descarga.
El trabajo geométrico es comparable: A procesa aproximadamente 2,82 millones
de triángulos contando sombras en ambos motores; B alrededor de 5,25–5,30
millones. La variación por culling/animación se conserva en las filas crudas.
No se atribuye ninguna supuesta ganancia a dibujar menos contenido.

## Por qué RAF y GPU aislados no bastan

Filament puede omitir frames dentro de `Renderer.render()`. Los 60 callbacks
RAF no significan 60 imágenes: B llegó a omitir 207–233 de los 300 intentos en
algunos bloques. Se contaron envíos reales y tiempos entre frames aceptados,
no se presentaron esos callbacks como FPS renderizados.

El temporizador nativo de Filament/WebGPU no está implementado. La evaluación
instrumenta los render passes reales; Three usa una consulta WebGL alrededor
de todo render. Sus alcances difieren, de modo que decide la cadencia, no la
suma CPU+GPU ni un valor GPU aislado. En C algunas muestras GPU favorecen
Filament, pero la ventaja varía entre repeticiones y no mejora el frametime.
No hay un cuello de CPU corregido y validado que permita autorizar una
migración por expectativa.

El [control sin interceptores](resource-controls/) mantiene el orden negativo:
A entrega 54,34 FPS en Three y 20,78 en Filament; B, 15,03 frente a 9,02;
C, 60,14 frente a 59,54. Es un control separado de una sola pasada, no otra
estimación repetida para mezclar con la tabla. Su variación refuerza la
necesidad de conservar rangos y no vender porcentajes como constantes.

## Optimización intentada y problema estructural acotado

Se preparó agrupación explícita de estáticos por chunk en Three: 604→118
grupos, sin perder los 1.415.471 triángulos. En Filament se activó su sistema
nativo `setAutomaticInstancingEnabled(true)`. **No pudo completar un render**:
el motor genera un descriptor-set per-renderable con recursos indefinidos.
WebGPU rechaza `createBindGroup` con `Required member is undefined`.

El fallo se reproduce también sin sombras, mientras el control desactivado
funciona. Se inspeccionó el descriptor real y el código oficial del commit
fijado. [Diagnóstico, capturas y reproducción](automatic-instancing/README.md).
Los resultados parciales bajo `results-optimized/` se excluyen de la comparación
numérica: no hay medición válida del Filament optimizado. No se presenta un
crash como un número de rendimiento ni se fuerza un fork del motor.

El instancing explícito de hierba es una ruta distinta y sí funciona. Usa
`getInstanceIndex()` y una textura de datos; por tanto, no se afirma que
Filament carezca de instancing. Rehacer la ruta automática defectuosa o crear
otro sistema completo de agrupamiento para los GLB no está justificado por
una ventaja ya demostrada.

## Materiales, memoria y recursos

La hierba conserva viento 8, normales, pigmento, LOD en shader y textura/mips
idénticos. En el control visual fijo la diferencia media de sus píxeles
compartidos fue 0,01294/255. [Evidencia y límites](GRASS-PARITY.md).
Esto prueba un material estilizado real en Filament; no afirma que se hayan
recreado los seis biomas ni todo AfricanToon.

A densidad 1, actualizar 1% de instancias envía 1.712 bytes en Three frente a
520.192 en la ruta Filament de textura completa. El control de API CPU mide
aproximadamente 0,003 ms frente a 0,419 ms; no incluye todo el coste posterior
de transferencia GPU. Los datos completos conservan creación/destrucción de
recursos y la prueba de ciclos de un GLB pequeño.

El runtime oficial tiene 279.673 bytes JS + 4.489.566 WASM; el archivo web
descargado ocupa 1.961.850 bytes comprimidos. Los materiales propios suman
79.971 bytes. Los GLB comunes de diagnóstico tienen 64.129.832 bytes cada uno;
son fixtures exportados, no un paquete final de producción.

La preparación A tarda 0,75–0,77 s en Three frente a 1,51–1,52 s en Filament;
B, 1,11–1,29 frente a 1,76–1,79 s; C nativa, 0,14 frente a 0,29 s. Son tiempos
locales con caché del sistema, no descarga de Internet. Filament alcanza una
capacidad lineal WASM de 292.290.560 bytes en A/B y 47.185.920 en C. No equivale
a memoria residente viva; no se compara sin más con el heap JS de Three.
La memoria GPU WebGL total no está expuesta y se deja sin número; la de WebGPU
es una estimación documentada, no una medición del controlador.

## Alcance cerrado

No se ejecuta la fase 2: faltan beneficios cuantitativos, el control optimizado
encuentra un impedimento interno y no existe fidelidad artística completa
validada. No se sustituye ningún subsistema del juego, no se introduce una
segunda arquitectura permanente y no se incorporan pilotos descartados del
laboratorio. Los prototipos y evidencias quedan aislados para revisión.

La compatibilidad probada es Chrome/Intel de este equipo. La compilación WASM
completa local, Safari/móviles, fallback Filament/WebGL2, campañas prolongadas
y validación artística de los seis biomas **no se declaran realizadas**. Eran
condiciones de una migración que no se autoriza; no se usan como promesas para
eludir la decisión negativa. El juego conserva su renderer WebGL2 existente.

Build, sintaxis de navegador y 38 pruebas de renderizado pasan. La suite global
de campañas se interrumpió y no se cuenta como pasada. Las instrucciones y
versiones están en [REPRODUCE.md](REPRODUCE.md); la auditoría técnica y licencias
en [FEASIBILITY.md](FEASIBILITY.md).
