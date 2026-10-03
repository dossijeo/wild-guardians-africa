# Finca grande lejos del origen: QA-158

Implementación `fc94ba9`; fixture y evidencia `f70226d`. Caso verificado:
colocaciones, colisiones, streaming y persistencia con rendimiento medido.
La prueba no acredita un objetivo de FPS ni declara terminado el trabajo de
optimización de la versión web.

## Preparación y alcance

[Fixture](../tests/browser/large-farm.html) en navegador integrado, origen QA
5180, Sabana/Mapungubwe original y semilla 712. Parte del poblado inicial
transitable original. Se prepara expresamente un checkpoint de postcampaña
(día 101, completedNights=100, postgame=true), porque fundar otro poblado exige
postcampaña. No se presenta como una campaña de cien noches jugada.

Con crédito QA explícito de 1000000 monedas, comandos nativos compran dos
centros, un segundo poblado legal cerca de (4215, −4084), 24 defensas de adobe
y 600 semillas: 75 de cada una de las ocho especies. Son 627 operaciones
monetarias; saldo final 924385. El centro lejano está en (4235,729; −4075,633)
y asociado al nuevo poblado mediante ruta real.

El riego y crecimiento botánico se preparan con waterPlant/advancePlant nativos
en cohortes de 20 %, 45 %, 70 % y madurez. No se afirma que trabajadores hayan
producido ese estado. La medición bloquea la simulación con pausa QA: no avanza
economía, viento simulado, trabajadores ni ataques. No sustituye QA-155 de
concurrencia ni una medición de partida activa.

La primera preparación de defensas cerraba el camino al poblado y se descartó
al fallar la aserción; la distribución definitiva conserva una ruta transitable.
El ensayo final empieza de nuevo sin esos datos fallidos.

## Colocaciones y persistencia

Se comprueban las matrices de las 600 instancias contra sus plantas lógicas,
incluyendo coordenadas globales restauradas y superficie original. El error
máximo de Float32 observado es 0,000001872 unidades. Los centros y muros
conservan exactamente x/z globales y colisiones: 26/26 puntos bloqueados,
26/26 obstáculos presentes. La ruta centro–poblado es idéntica en los cinco
muestreos. El origen gráfico se ajusta a (4224, −4080), sin mover el estado.

Tres viajes de 2048 unidades en ambos ejes descargan los 25 chunks originales;
en cada destino quedan otros 25 y cero instancias de cultivos residentes.
Cada regreso repone los 25 originales y las 600 plantas. La capacidad del lote
se amplía a 1024, sin deducir un límite jugable de esa capacidad.

SaveRepository escribe únicamente qa-large-farm en el origen QA. Después se
crean Navigation y WorldScene nuevos desde el guardado. Los snapshots preparado,
anterior al guardado y recargado son idénticos byte a byte: **343323 bytes**,
SHA-256 `00b3da5199c729a0a7cb991d38b4df3b9052f867973d3a65ba1a9ba2ea386ec6`.
Identidades, coordenadas, supresiones, saldo, RNG, colisiones y datos botánicos
persisten. La operación guardar/cargar tarda 16,40 ms; la carga completa del
mundo y sus chunks tarda 5457,50 ms en esta muestra local con caché de navegador.

## Rendimiento observado

Calidad media, viewport CSS 1280×720, DPR 1,25, framebuffer 1600×900.
Cada medición descarta ocho frames de calentamiento y conserva 60 muestras:
300 frames medidos en total. Misma cámara de finca en las cinco series.

| Serie | CPU render media, ms | Intervalo de frame medio, ms | Intervalo p95, ms |
| --- | ---: | ---: | ---: |
| Inicial | 12,38 | 59,98 | 66,20 |
| Regreso 1 | 10,52 | 68,33 | 87,00 |
| Regreso 2 | 8,64 | 69,60 | 82,50 |
| Regreso 3 | 10,78 | 71,21 | 89,30 |
| Recarga completa | 9,81 | 68,65 | 84,90 |

renderer.info registra 69 llamadas y 2938760 triángulos en la pasada de escena
observada, constantes en estas series. No es el recuento combinado de todas
las pasadas ni el tiempo GPU; no se usó una consulta GPU en este ensayo.
El intervalo entre frames incluye planificación y espera de navegador/GPU,
mientras el tiempo CPU mide únicamente la llamada síncrona world.render.
Las diferencias entre series no acreditan degradación causada por streaming
ni una mejora de la corrección de limpieza: no hay comparación A/B del fix.
Los tiempos sí muestran una escena pesada; quedan las optimizaciones descritas
en [prioridades de rendimiento](performance-priorities.md).

Al volver y tras recarga, renderer.info.memory conserva **111 geometrías y
21 texturas**. Lejos de la finca hay 117 geometrías y 21 texturas, correspondientes
a otro conjunto residente. Estos contadores son objetos registrados, no bytes
GPU ni prueba de memoria constante para viajes indefinidos. Las 28 raíces de
entidades siguen registradas fuera de cámara; no se afirma que se descarguen
con el terreno. No hay errores ni avisos de consola.

## Corrección de limpieza y validación

Al revisar el crecimiento de lotes se detectó que createCropBatch.dispose
retiraba meshes, geometrías y materiales, pero no emitía dispose del propio
InstancedMesh. Three r180 usa ese evento en WebGLObjects para retirar los
atributos instanceMatrix/instanceColor; liberar solo la geometría no cubre
esos buffers. `fc94ba9` añade mesh.dispose tanto a los 40 modelos originales
como a los 32 bridges. La prueba comprueba retiro y evento en los 72 meshes.
No se cuantifica aquí un ahorro de memoria GPU en bytes.

22/22 pruebas dirigidas aprobadas, cero fallos u omisiones, 2011,412 ms:
render-origin, render-origin-window, chunk-stream, crop-upload y save-game.
Build aprobado (139 módulos, 6,24 s; aviso de tamaño de bundle existente).
Paquete web aprobado: 559 archivos, 379783708 bytes, 796 enlaces relativos,
20 GLB de runtime y ningún duplicado original.

[Datos completos y muestras](qa/large-farm/final-report.json),
[comparación independiente](qa/large-farm/comparison.json),
[snapshot preparado](qa/large-farm/prepared-snapshot.json),
[snapshot recargado](qa/large-farm/reloaded-snapshot.json),
[consola](qa/large-farm/console.json) y
[captura recargada](qa/large-farm/reloaded.png).
La cobertura visual es una combinación nativa, no las treinta combinaciones
de QA-001. Tampoco acredita campaña larga, móviles o estabilidad indefinida.
