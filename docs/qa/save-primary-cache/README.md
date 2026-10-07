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
publica sus escrituras solo al completarse. No constituye una nueva ejecución de
IndexedDB nativo; la fixture existente `tests/browser/indexed-saves.html` sigue
siendo necesaria para aceptación de navegador.

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
Gate de sintaxis: 134 páginas/133 scripts sin errores. La reproducción nativa y
el frametime móvil permanecen sin acreditar para este cambio.

Paquete web verificado: 641 archivos, 382702425 bytes, 859 enlaces relativos y
20 GLB de runtime; sin duplicados originales o suelo/poblado sustituido.
