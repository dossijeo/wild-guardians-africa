# Liberación visual al volver al poblado

Antes de este cambio, un trabajador que alcanzaba el poblado pasaba a `home`,
pero `WorldScene.sync()` conservaba su objeto y su rig animado ocultos hasta el
siguiente amanecer. Una finca con muchos trabajadores terminaba la jornada con
esqueletos y mezcladores todavía instanciados aunque no se dibujaran. El paso
de sincronización también seguía recorriendo esos objetos cada fotograma.

La escena ahora excluye a los trabajadores `home` de su conjunto visual activo.
El mecanismo de retirada existente elimina el objeto de la escena y libera el
mezclador y el esqueleto de su rig. Si el centro se repara o se coloca otro
durante la misma jornada, el contrato desplazado puede reactivarse y la escena
solicita un rig nuevo. El contrato permanece en `state.workers` hasta la
frontera de jornada porque las pruebas QA-054/055 exigen esa recuperación sin
un segundo salario; no es una entidad gráfica retenida.

`tests/home-worker-rig-retirement.test.js` falla con el código anterior porque
el objeto oculto aún existe. Con el cambio comprueba liberación, conservación
del contrato y nueva solicitud de rig tras la reasignación. Pasan 36/36 pruebas
dirigidas de escena, carga de actores, rutas de trabajadores y recuperación de
desplazados. Esta prueba acredita el ciclo de vida de la escena; no mide bytes
GPU ni una mejora de FPS.
