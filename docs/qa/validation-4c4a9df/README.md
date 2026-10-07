# Verificación canónica de main 4c4a9df

Comandos completados con código de salida cero:

- `npm run verify:assets`: 24 fuentes, 505 recursos, 126 coincidencias exactas de SFX; cuatro bibliotecas originales de trabajadores con 48 acciones y materiales originales conservados.
- `npm run verify:plan`: 123.048 aserciones, 5.000 escenarios de reparto y 20 combinaciones de contexto/presupuesto.
- `npm run verify:balance`: generación reproducible con datos originales y revisiones aprobadas.
- `npm run verify:audio-runtime`: 21 pistas, 550 recetas/ventanas y 126 SFX con hashes/exportaciones válidos; reducción de bytes codificados, no medida de RAM.

Los cuatro logs conservan la salida real, normalizando solamente finales de línea a LF. `sources.json` registra el commit y hashes de las fuentes disponibles seleccionadas.

La suite local completa `npm test` está todavía en ejecución al registrar esta evidencia, sesión6458/proceso46056; no se declara aprobada. Se comprobaron los procesos hijos vivos de aceptación postgame, finca activa, campaña, onboarding guiado, vertical y mundo. Esta observación justifica continuar esperando el mismo proceso, sin reiniciarlo por la ausencia temporal de nuevas líneas en el log ordenado del runner.

Estos verificadores no demuestran audición de todos los SFX, integración visual, experiencia móvil, 100 noches con el balance actual, recuperación WebGL ni finalización de los 159 casos del plan. Las campañas intensivas históricamente congeladas también siguen activas y no se sustituyen por estos verificadores.

## Resultado terminal posterior de la suite

La sesión6458 terminó con código cero: **2.684 tests pasan, cero fallos, cancelaciones u omisiones**, en 1.123.547 ms. `full-suite.txt.gz` conserva los bytes completos del log; `full-suite-result.json` registra su hash y alcance.

Durante esta ejecución se añadieron cambios de agrupación de cultivos en incursiones (`1429a8d`). Aunque las pruebas restantes tenían módulos ya cargados, no se verificó de forma integral el instante de lectura de cada fuente/fixture. Por tanto esta ejecución no certifica un checkout congelado ni el `main` actual. Las nuevas pruebas del agrupador se ejecutaron separadamente y no forman parte de este conteo. Se prepara una repetición desde un archivo Git completo de `61a583a`, con fuentes inmutables, para obtener una atribución inequívoca.
