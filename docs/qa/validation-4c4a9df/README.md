# Verificación canónica de main 4c4a9df

Comandos completados con código de salida cero:

- `npm run verify:assets`: 24 fuentes, 505 recursos, 126 coincidencias exactas de SFX; cuatro bibliotecas originales de trabajadores con 48 acciones y materiales originales conservados.
- `npm run verify:plan`: 123.048 aserciones, 5.000 escenarios de reparto y 20 combinaciones de contexto/presupuesto.
- `npm run verify:balance`: generación reproducible con datos originales y revisiones aprobadas.
- `npm run verify:audio-runtime`: 21 pistas, 550 recetas/ventanas y 126 SFX con hashes/exportaciones válidos; reducción de bytes codificados, no medida de RAM.

Los cuatro logs conservan la salida real, normalizando solamente finales de línea a LF. `sources.json` registra el commit y hashes de las fuentes disponibles seleccionadas.

La suite local completa `npm test` está todavía en ejecución al registrar esta evidencia, sesión6458/proceso46056; no se declara aprobada. Se comprobaron los procesos hijos vivos de aceptación postgame, finca activa, campaña, onboarding guiado, vertical y mundo. Esta observación justifica continuar esperando el mismo proceso, sin reiniciarlo por la ausencia temporal de nuevas líneas en el log ordenado del runner.

Estos verificadores no demuestran audición de todos los SFX, integración visual, experiencia móvil, 100 noches con el balance actual, recuperación WebGL ni finalización de los 159 casos del plan. Las campañas intensivas históricamente congeladas también siguen activas y no se sustituyen por estos verificadores.
