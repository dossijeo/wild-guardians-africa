# Validación repetida del respaldo IndexedDB

Base: `c18d119`. El repositorio conserva únicamente el texto de la última
escritura confirmada. Si la copia anterior de la misma ranura coincide byte por
byte con ese texto, ya fue validada antes de la escritura y no necesita otro
JSON.parse ni otra validación de entidades para convertirse en respaldo.

La captura/validación del estado nuevo, el orden de autosaves y la transacción
atómica no cambian. Una copia externa diferente, una ranura distinta, corrupción
o un cambio de versión de la base siguen la validación completa. Una transacción
abortada no actualiza la caché; eliminar la ranura libera su referencia.

`tests.log.gz` (hash en `hashes.json`): 19 pruebas dirigidas correctas, incluidas modificaciones externas,
corrupción, identidad de ranura, fallo de escritura, captura de estados en cola,
rechazo del estado nuevo inválido y recuperación. El doble de transacciones
publica sus escrituras solo al completarse. La prueba dirigida usa un doble de
transacciones y se complementa con la ejecución nativa descrita abajo.

`measure.mjs` compara los repositorios antes/después con snapshots archivados
reales y transacciones en memoria. `report.json` conserva hashes y todas las
muestras. En seis escrituras por fixture las copias primary/backup coinciden
exactamente. Se omiten cinco análisis de primarias repetidas; los tres restantes
son los intentos iniciales de recuperar una ranura que aún no existe.

Los tiempos son CPU aislada, **no FPS ni latencia total de IndexedDB**. Las tres
campañas largas permanecían ejecutándose. Las muestras de 7,3 MB presentan deriva
importante (antes 4365–11156 ms, después 1994–5989 ms por diez escrituras), por lo
que no se acredita un porcentaje estable de mejora. La captura y serialización
del estado nuevo siguen siendo costosas; no se declara resuelto todo tirón de
guardado.

La caché intercambia memoria por CPU: retiene una única cadena de 343331 o
7265556 unidades de código en estos ensayos. El límite de almacenamiento de dos
bytes por unidad sería 0,69/14,53 MB respectivamente; **no es una medida de heap**.
No se conserva un historial de cadenas ni una caché por cada ranura. Los estados
históricos de día 101 usados para medir no prueban la campaña actual de 100 noches.

Build correcto, 225 módulos, 14,84 s; advertencia preexistente de bundle grande.
Gate de sintaxis: 134 páginas/133 scripts sin errores. El frametime móvil
permanece sin acreditar para este cambio.

Paquete web verificado: 641 archivos, 382702425 bytes, 859 enlaces relativos y
20 GLB de runtime; sin duplicados originales o suelo/poblado sustituido.

## Recuperación con IndexedDB real

En el navegador integrado, `http://127.0.0.1:5191/tests/browser/indexed-saves.html`
ejecutó primero los once casos originales sobre el runtime de `ee78c91`.
`native-initial-report.json` y `native-initial.png` conservan esa ejecución.
Después se añadieron dos casos y se recargó la fixture por ese cambio de código:
`native-report.json` y `native.png` muestran **13 controles correctos**, ningún
error y cero ranuras temporales restantes. Se usaron únicamente ranuras QA con
prefijo aleatorio, sin preparar ni eliminar partidas de usuario.

Además de migración, corrupción, ranura ajena, orden de captura y transacción
abortada, se verificó que una primaria válida escrita externamente tras el aborto
se convierte en respaldo; un estado nuevo inválido no sustituye esa recuperación.
`native-provenance.json` conserva los hashes del runtime y de la fixture actual,
y el hash del blob Git de la fixture original; `hashes.json` contiene los hashes
de informes y capturas.

Esto acredita estas rutas de recuperación en IndexedDB nativo de localhost. No
mide capacidad/cuota máxima, latencia en plantaciones grandes ni comportamiento
de almacenamiento en el Pixel físico o el iframe de itch.io.
