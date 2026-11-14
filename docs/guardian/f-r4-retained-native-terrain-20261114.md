# f-R4 parcial: terreno preparado con una asignación nativa conservada

Fecha: 2026-11-14. Base: `ece22260b`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y los
[cultivos preparados](f-r4-prepared-crop-instances-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

## Cambio efectivo

Las mutaciones de residencia, props y terreno ya pueden preparar una imagen con
un trabajador nativo activo cuando conservan su asignación y su apoyo gráfico.
Se retienen rig, materiales, textura de movimiento, fases y referencia nativa.
El mismo paquete representa el mundo nuevo y consume los avances posteriores
del reloj C++ durante un bloqueo del preparador, sin posiciones periódicas JS.

El preflight C++ existente ya calcula los conjuntos de rutas afectadas. La
propuesta conserva ahora si esos conjuntos están vacíos, sin otra búsqueda ni
otro planificador. El resultado pertenece al ticket y a su read set de cuerpo,
entidades, intenciones, reservas, reloj, puertas y mundo. La consulta no publica
eventos ni concede tiempo; una dependencia cambiada invalida la propuesta.
Si hay una retirada directa posible, no se concede conservación: sus cierres por
disco detenido y puerta siguen pendientes de proyección gráfica, con el veto activo.

El canal normal de terreno transporta ese booleano en el sobre de la propuesta.
Omitirlo conserva el comportamiento protegido anterior; un valor mal formado se
rechaza. El surface exige además los participantes del roster original. Estos
revalidan la identidad de cada asignación y todos los apoyos de su ruta completa,
sin sustituir bindings ni modificar su propietario. Una liberación gráfica
intermedia cambia la revisión del surface e invalida también propuestas vacías.

La prueba gráfica sigue malla, geometría, atributos, arrays, versiones, visibilidad
y época. Una revisión de props que conserva exactamente la malla de terreno puede
mantener esa prueba aunque aumente el número de revisión. La preparación inicial
sigue exigiendo el manifiesto confirmado exacto. El playback histórico conserva
su validación de manifiesto anterior; no se amplían sus permisos. Un apoyo nuevo,
un array/version alterado o una época distinta invalidan la prueba nativa.

El ensayo descubrió otra frontera real: el estado se reconcilia antes de adoptar
el batch de terreno. El read set del cultivo conserva sus entradas gráficas,
selección y revisión del propietario; avanzar solo `elapsed` no sustituye esos
datos ni invalida la reserva. Cambiar crecimiento, bendición o selección sigue
invalidándola. El reloj continúa separado de la propiedad de recursos.

## Referencias de implementación y decisiones

- [Godot 4.5.1, nav_map_3d.cpp](https://github.com/godotengine/godot/blob/4.5.1-stable/modules/navigation_3d/nav_map_3d.cpp):
  `_build_iteration` toma referencias a iteraciones de regiones; no cambia la
  iteración consultada mientras construye la siguiente. `_sync_iteration`
  intercambia la selección cuando está lista y conserva lectores anteriores.
  Aplicación: usar nuestro batch/packet ya existente y retener las dependencias
  admitidas que siguen siendo las mismas. No se clona todo IntentState ni el mundo.
- [Detour 1.6.0, DetourCrowd.cpp](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp):
  `checkPathValidity` distingue corredor válido y petición de replan, en vez de
  sustituir cada corredor por cualquier actualización del mapa. Wild Guardians
  conserva esa distinción mediante sus preflights completos por evento. No adopta
  su reparación por tick ni su lookahead limitado como autoridad de una ruta completa.

No se incorporan dependencias, otro ejecutor ni otra arquitectura de navegación.

## Validación y límites

Pasan 69 pruebas dirigidas. La selección amplia de 145 archivos registra 1630
casos: 1628 aprobados y los dos fallos heredados Carry/Harvest; cero omisiones
y cancelaciones. Compilan los binarios standalone y pthread. Build aprobado en
42.38s; 308 scripts inline y los módulos propios pasan sintaxis. El
[recibo de validación](performance/native-retained-route-validation-20261114.json)
registra selección, comandos, hashes WASM y de fuentes anteriores al ensayo final.
El [recibo de hardware](performance/native-retained-route-terrain-20261114.json)
conserva las ocho mutaciones y sus fronteras nativas/GPU.

El recibo NVIDIA usa la ruta C++ existente, el trabajador original `olderFemale`,
su rig de tres mallas, centros/muros/caja y tres etapas de cultivo originales.
Ejecuta ocho mutaciones: baja/readmisión de chunk, supresión/restauración de prop
y cuatro revisiones de asentamientos. El preparador se bloquea 1.500 ms antes de
cada commit físico. Durante una ventana de unos 220 ms se avanza la ejecución C++
cada 20 ms, publicando solo su control/reloj directo. El resto del bloqueo mantiene
la frontera finita alcanzada; no se atribuye avance lógico a tiempo no ejecutado.

El consumidor presenta repetidamente el mismo paquete del mundo nuevo durante
esa ventana, con varios tiempos nativos distintos. Las posiciones nativas pasan
de z=24 a aproximadamente z=26,6; el registro JS del trabajador sigue intacto.
No cambian IDs de malla/geometría/material ni el hash de huesos/matrices CPU.
No aparecen recursos ni forks COW después de «listo». Se mantienen los readbacks
de matrices GPU de cultivos y la comparación con el apoyo C++ del incremento
anterior; el cierre espera el drenaje real del consumidor.

La prueba observa referencias, fases/reloj nativos y envío GPU del rig real; no
añade una lectura de vértices de su silueta ni acredita ausencia de tirones de
producto. La admisión de la ruta del fixture sigue siendo explícita. Quedan las
asignaciones nuevas y las retiradas/suspensiones que una mutación sí provoca,
el cambio real de apoyo bajo una ruta, los demás dependientes y la integración
ordinaria con todas las intenciones, consecuencias, puertas y persistencia.
Se continúa por esas transiciones; no se cierra f-R4 ni se pasa de A a B/C/D.
