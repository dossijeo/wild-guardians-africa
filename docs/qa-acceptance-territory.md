# Amanecer y residencia territorial

Implementación `4890c6d`, 3 de octubre de 2026. Continuación de la auditoría de plantilla del Plan Maestro.

## Corrección acreditada

Al fundar un poblado, el juego comparaba los caminos desde el punto de servicio de cada centro, pero omitía la distancia hasta el primer waypoint. La ruta directa de Navigation contiene solo el destino: su coste calculado era cero. El ensayo QA-052 fallaba porque un poblado nuevo más cercano no podía sustituir la asociación anterior: [before.log](qa/acceptance-territory/before.log).

Ahora se suman todos los segmentos, empezando en el punto de salida del centro. Se excluyen las rutas que Navigation declara inaccesibles y se desempatan distancias iguales por ID persistente. La cultura física del centro y las residencias de los contratos actuales se conservan.

## Pruebas de integración

[acceptance-workforce.test.js](../tests/acceptance-workforce.test.js) tiene ahora trece ensayos. Se usan las órdenes reales de plantar, construir, contratar y fundar poblados, con presupuesto inicial de ensayo y postgame. Los caminos rectos o con rodeos son dobles explícitos del proveedor de navegación: esta prueba mide selección logística y contratos, no demuestra que un terreno gráfico concreto sea transitable.

| Caso | Evidencia |
|---|---|
| QA-042 | Mismo peso y mismo instante de creación: ordenar por ID persistente produce el mismo ganador pese a invertir el array. Complementa el desempate por antigüedad del bloque anterior. |
| QA-050 | Centro nuevo a mitad de jornada: contratos y planta antigua conservan su vínculo durante el día. Al avanzar realmente hasta el siguiente amanecer, los trece cultivos y sus tareas se asocian al nuevo centro. Contratar cuatro empleados produce 1/3 y cobra 400 una sola vez. |
| QA-052/143 | Un empleado camina y trabaja durante 60 segundos; fundar un poblado cercano cambia la asociación del centro, sin alterar empleado, residencia, contrato ni cultura física. Se completa la jornada: regresa físicamente a (0,0), su origen, sin contratar otra persona. La partida guardada evoluciona de forma idéntica al cargarla. |
| QA-052/143 | Tras el siguiente amanecer, el nuevo contrato sale de la entrada del poblado nuevo; solo se cobra el salario normal de 100. |
| QA-052 | Un destino euclidianamente cercano con un rodeo largo pierde frente al camino más corto. Un destino sin ruta no se elige. Si el poblado antiguo resulta inaccesible, el centro se vincula al nuevo accesible; el empleado existente conserva su origen. |

Resultados dirigidos: **87/87**, sin fallos ni omitidas: [directed.log](qa/acceptance-territory/directed.log). Incluyen reglas, juego, contratos y desplazados; no son 87 pruebas nuevas.

Suite completa local de `4890c6d`: **688/688**, sin fallos ni omitidas, en 321,03 segundos: [full.log](qa/acceptance-territory/full.log). Verificación del plan: 123.048 aserciones y 5.000 escenarios originales de reparto, todos correctos. Se han comprobado los 159 IDs únicos, el hash sin cambios del plan original y la existencia de las evidencias del registro.

La [CI 37091884829](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37091884829) terminó correctamente para el mismo commit: suite completa, verificaciones de recursos/reglas, build y paquete web. Evidencias: [ci.json](qa/acceptance-territory/ci.json), [ci-results.txt](qa/acceptance-territory/ci-results.txt).

Quedó fuera de este bloque la elección de poblado al construir un centro por primera vez: en `4890c6d` todavía utilizaba distancia euclidiana. Se corrigió posteriormente en `611a77c`: [asociación inicial por camino válido](qa-center-logistics.md). El objetivo completo sigue abierto.
