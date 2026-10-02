# Acciones y buffers de cultivos

Implementaci贸n de las prioridades 1 y la primera parte de 6 del
[plan de rendimiento](performance-priorities.md).

Las acciones del men煤 de herramientas, los muros encadenados y la fundaci贸n de
poblados llaman a `syncResidentProps`, sin forzar streaming ni horizonte. La
poblaci贸n original de cada chunk conserva sus identificadores; 煤nicamente los
slots cuya lista filtrada cambia reemplazan sus lotes LOD y agua de assets.
Las geometr铆as de suelo y agua de chunk, dem谩s slots y poblaci贸n l贸gica quedan
estables. Se invalidan contactos, bounds, colisiones de manos y sombras. Los
nuevos chunks del worker filtran con el estado de supresi贸n vigente al instalarlos.
La navegaci贸n sigue actualiz谩ndose mediante `Navigation.setState` y el guardado
sigue usando `state.suppressed`.

Las vistas privadas de ocultaci贸n comparten arrays CPU, pero poseen identidades
GPU propias. As铆, retirar un slot no elimina los buffers de otro chunk ni los del
proxy de sombra. El agua retirada libera sus instancias y material, conservando
la geometr铆a del prototipo. Hay pruebas de restauraci贸n de props y de identidad
de 25/49 terrenos, contactos, shadow proxies y cobertura.

Los cultivos comparan valores en precisi贸n Float32 y recuerdan poses por slot.
Posici贸n/rotaci贸n y crecimiento/morph se invalidan por separado. Las subidas
especifican el rango de componentes cambiado dentro del prefijo usado; cambios
anteriores pendientes se conservan si hay varias actualizaciones antes del dibujo.
Los originales y puentes mantienen su topolog铆a, shaders y viento por uniforme.
La asignaci贸n inicial de un buffer GPU sigue teniendo el coste de su capacidad;
esta optimizaci贸n evita subidas posteriores id茅nticas. No elimina los recorridos
de plantas, consultas de altura ni toda la CPU de escena.

Evidencia de navegador en `docs/qa/performance-actions/`, semilla 712,
Sabana/Mapungubwe, media, Intel UHD/ANGLE:

- Retirada de un prop: **1 chunk / 1 slot afectado, 25/25 terrenos conservados,
  0 geometr铆as de suelo liberadas**, navegaci贸n suprimida y cero errores WebGL.
- Escena de 16 plantas (ocho maduras y ocho morph), defensas originales,
  origen (192,48), reloj fijo: **cero incrementos de versi贸n de matrices y de
  atributos de crecimiento en 210 frames**. Estado l贸gico intacto, 210 hits de
  sombra y cero errores. Avanzar 0,1 s invalida la sombra por viento/poses.
- Referencia de ese encuadre: 180 consultas GPU v谩lidas, sin disjoint, GPU media
  14,26 ms, CPU de env铆o 10,62 ms, 40 calls. No es una comparaci贸n antes/despu茅s
  ni una finca grande o un benchmark del poblado completo; no acredita mejora
  porcentual ni FPS de campa帽a.

Validaci贸n completa final y CI se registran al finalizar las comprobaciones.
Siguen pendientes los registros de materiales/agua y las dem谩s prioridades.

Tras la correcci髇 de superficie VFX del origen relativo: regresi髇 integrada **630/630**, CI 37077302380 aprobada y paquete de 379.665.147 bytes; v閍se [QA de proyecci髇 y VFX](qa-render-origin-window.md).
