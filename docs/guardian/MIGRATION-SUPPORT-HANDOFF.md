# Traspaso del apoyo a Sol High

Entrada: [operaciones](MIGRATION-OPERATIONS.md). Fuente de estado y decisiones:
[objetivo](MIGRATION-OBJECTIVE.md) y [checklist](A6-CHECKLIST.md).

Se añaden únicamente `tools/guardian/migration-support/`, dos archivos de tests
de apoyo/aceptación pendiente y documentos `MIGRATION-*` de apoyo. No se modifican
producción, WASM, fixtures, package.json ni harnesses que estás implementando.

| Mejora | Uso inmediato | Trabajo que evita |
|---|---|---|
| Contexto | `node tools/guardian/migration-support/cli.mjs context` (`--json` para hashes/rutas) | Releer todo el historial o confundir un cierre de componente con A6. |
| Laboratorio | `.../cli.mjs lab --scenario harvest --run --gpu`; `--scenario all` primero sin `--run` para revisar alcance | Crear otro renderer/ejecutor o repetir el mismo harness para cada variación. |
| Impacto | `.../cli.mjs impact --files <rutas propias separadas por comas> --tier focused`; añadir `--run` | Compilar y ejecutar toda la suite en cada edición; conserva guards y expande ante entradas desconocidas. |
| Investigación | `.../cli.mjs research --topic '<frontera>'`; leer [fuentes y primera ficha](MIGRATION-RESEARCH.md) | Rediseñar admisión/identidad/recursos ya resueltos o investigar sin una conclusión aplicable. |
| Cierre vertical | [Matriz Harvest y otras intenciones](MIGRATION-VERTICALS.md) y TODO de aceptación | Dar por terminada una entrega porque sus piezas aisladas pasan. |

Puedes reutilizar inmediatamente la selección de guards, la unión de pruebas de
asignación/acción y los escenarios de puertas, bloqueo y recuperación. Cuando
conectes consecuencia y siguiente tarea, extender el harness existente y sustituir
los TODO correspondientes por aserciones sobre efectos reales. El apoyo nunca
emite permisos, mueve cuerpos ni produce efectos de cosecha.

Los escenarios `obstacles`, `pause` e `invalidation` aún validan componentes;
puertas y recovery son ensayos complementarios. Harvest GPU usa autoridad de
componente en página y B como fixture Home. No acredita productor ordinario,
consecuencia, siguiente tarea ni A/B/C. Restauración estaba en tus cambios locales:
el índice no sobrescribe ni da por cerrado ese avance.

Evidencia, fallos, comandos y hashes: [validación del apoyo](MIGRATION-SUPPORT-VALIDATION.md).
Los informes están en `.cache/migration-support/` y marcan cambios concurrentes.
`--require-complete` devuelve 2 mientras falte integración; no interpretar 0 como
cierre A6. Antes de un commit, fetch y añadir solo rutas propias; nunca reset/stash
del árbol compartido ni force push. Los commits finales y estado remoto se entregan
en la notificación de cierre para no escribir en este documento su propio hash.
