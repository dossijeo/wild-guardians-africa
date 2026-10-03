# Identidad de ranura y errores de escritura

Corrección `9315daf`, relacionada con el contrato de guardado de la sección 20
del Plan Maestro y QA-144. La aceptación completa de sus cuatro disparadores
sigue parcial; este bloque verifica aislamiento y errores de almacenamiento.

## Problemas corregidos

Un JSON válido de la ranura B colocado bajo la clave de A se aceptaba al cargar A.
El siguiente autoguardado podía entonces actuar sobre B. También podía copiarse
ese contenido incorrecto al backup de A, perdiendo su última copia recuperable.
[Tres regresiones previas](qa/save-isolation/regression-before.txt) fallan sobre
`6543fbb`: identidad primaria equivocada, contaminación del backup y aceptación
de otra campaña cuando ambas copias pertenecen a una ranura distinta.

El repositorio comprueba ahora el ID esperado en staging, primaria y backup.
Un contenido de otra ranura no se devuelve ni se usa para reemplazar el backup.
Si la primaria falla, sólo se recupera una copia válida de la ranura solicitada.
Si ninguna coincide, la carga falla; el listado omite esa entrada y conserva B.

La escritura del backup compartía un catch con su validación. Una excepción de
almacenamiento podía ignorarse y continuar reemplazando la copia principal.
Ahora se separan ambas operaciones: un backup inválido se conserva sin copiar
el contenido incorrecto, pero un fallo al escribir uno válido aborta la operación.

La UI anunciaba «Partida guardada» aunque save hubiera capturado una excepción.
`saveGame` devuelve éxito/fallo y sólo emite la confirmación después del éxito.
La vuelta al menú comprueba ese resultado antes de descartar estado, escena y
audio; con fallo permanece la partida abierta para poder reintentar.
No se modifica el esquema de guardado ni se añade un autoguardado periódico.

## Evidencia y límites

[100 pruebas dirigidas](qa/save-isolation/directed.txt), cero fallos/omisiones,
3.141,1117 ms. Incluyen el repositorio de producción, guardado de contratos/cajas,
eventos agrícolas, snapshots y traducciones. La batería nueva introduce fallos
explícitos en staging, backup y primaria mediante un adaptador de almacenamiento:

- No hay confirmación de éxito, se conserva la copia anterior del día 1 y
  la partida activa sigue en el día 2. Reintentar guarda el día 2 y confirma una vez.
- El autoguardado es silencioso; la confirmación manual sucede después de la
  escritura, no antes. El texto de éxito no se incorpora retroactivamente al snapshot.
- Cargar A con primaria perteneciente a B recupera A/día 1 desde su backup.
  B no se modifica; el listado presenta A y B con sus identidades propias.
- Una escritura posterior de A no reemplaza un backup válido por B.
  Si ambas copias de A contienen B, cargar A falla sin mutar almacenamiento.

El nuevo error dispone de traducción inglesa. El catálogo contiene 1.520 entradas;
la frase compuesta de error también se traduce correctamente.

[Build y paquete web](qa/save-isolation/build.txt) aprobados: 554 archivos,
379.690.407 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales.
Estos ensayos no simulan una cuota real del navegador ni comprueban el renderizado
del aviso de error. El guard de salida de la aplicación se revisó en código;
falta la prueba integrada de los cuatro disparadores de QA-144.
La [CI 37113331006](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37113331006)
de `9315daf` terminó correctamente: **829/829 pruebas**, cero fallos,
221.319,212879 ms, verificadores/build/paquete aprobados. [Log](qa/save-isolation/ci-log.txt)
y [metadatos](qa/save-isolation/ci.json). No se atribuye esta suite a la
corrección posterior del selector de autoguardado.
