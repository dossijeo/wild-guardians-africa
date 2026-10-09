# Auditoría de catálogo y disparadores SFX — 2026-10-09

Base revisada: main `bcf4613e6d58b79167ba4adc77e3d08144a55f1a`, worktree aislado, rama `codex/sfx-catalog-audit`. Sin cambios en gameplay, render, UI, audio de producción, voces, Biblioteca, loading ni archivos sonoros. Sincronizada antes de PR con main be2c7529, que sólo añade puertas de release documentadas.

[Inventario completo](inventory.md) / [JSON reproducible](inventory.json): 126 entradas trazadas y 126 originales comprobados por tamaño/SHA-256 contra banco, routing y referencia extraída. Los 126 hashes son distintos: cero archivos idénticos. Compartir propósito o tener varios disparadores no equivale a duplicar bytes.

| Clasificación | Entradas | Resultado |
| --- | ---: | --- |
| Asignado compatible en revisión de fuente | 100 | Mapeo y llamada actual identificados; no acredita reproducción audible. |
| Excepción de contexto | 4 | Viento fuerte, paso en madera, azada inicial y herramienta de reparación no tienen el contexto real requerido. |
| Reserva de alcance | 12 | Lluvia/trueno, saco, daño/muerte animal y recompensas sin evento aprobado. |
| Alternativa sin asignar | 10 | Variante genérica/contextual conservada; el contexto existente utiliza otra toma o no necesita una capa adicional. |

Los 26 últimos permanecen sin ruta activa de gameplay y disponibles en el banco/Biblioteca. Las clasificaciones conservan el `planClass` original: tres excepciones fueron propuestas de gameplay y la reparación fue propuesta contextual. No se rebautizan como integración completada.

## Cómo se contrastó la acción

El auditor anterior acreditaba exports y bytes. Ahora cada fila asignada incluye declaración, consumidor/adapter y llamada de aplicación. Los eventos lógicos trazan `emit` en game/raids/encounters/tutorial → `audio.process`; UI traza transición concreta → UiAudio → audio.sound; ambiente, pasos, granja, trabajadores, bestias, cooldown/desbloqueo y retrato trazan su update/observe → AudioSystem → main; partículas trazan building-effects → callback de escena → destructionCue. Cada selector y línea se comprueba al generar.

La revisión agrupada coteja propuestas del Apéndice A y guardas actuales: colocación/obra/compra sólo tras comandos aceptados; reparación al llegar/cobrar; cosecha entrega real, sin segundo ingreso; avisos de daño por estado/umbral; voces de especie por fase; pasos por contacto y superficie; granja por marcadores originales; entrada/salida del retrato por fase; cooldown positivo que llega a cero y desbloqueos reales; UI por transiciones. La información estática no demuestra que una rama ocurra en una campaña concreta, onset correcto, mezcla aceptable ni escucha.

`sourceMentions` se conserva separado. Ejemplo importante: movementSound contiene `step_wood`, pero el resolver usado por main no devuelve madera y la navegación bloquea el muelle especial. Esa mención no se convierte en una asignación. Las cuatro excepciones incluyen referencias de fuente y documentación de contexto; los recuentos antiguos dentro de esas notas históricas no sustituyen el inventario actual 100/26.

`semanticAlternatives` describe posibles sustituciones, no equivalencia sonora ni autorización para apilar clips: ui_sell frente a eco_crop_sold, genéricos de bestia frente a tomas específicas, movement_land frente al contexto npc_fall, spirit_invalid frente al aviso ui_error, etc. Varios usos de un mismo ID (por ejemplo unlock/postgame, adobe/reforzado o impacto en trabajador) se registran por ruta; no prueban solapamiento. La revisión no detectó un faltante obligatorio compatible que justificase añadir un disparador real nuevo en este barrido. Se conservan las decisiones actuales y las excepciones, siguiendo §19.3 del plan; no se inventan clima, daño animal, sacos, acciones Dig o recompensas para alcanzar «126 usados».

## Reproducibilidad y límites

`node tools/audit_sfx_catalog.mjs` regenera ambos inventarios; `node tools/audit_sfx_catalog.mjs --check` falla si ya no coinciden con fuente/bytes actuales. El JSON guarda hashes del auditor, documentos de contexto y archivos relevantes. La detección de productores/menciones es lexical y se complementa con selectors explícitos/revisión; no es análisis formal de todos los caminos posibles. Las pruebas dirigidas comprueban coherencia, vigencia, llamadas, reservas y selección lógica con bordes de audio simulados.

Sin GPU, browser, audio benchmark, decodificación/escucha nueva, dispositivo físico ni recorrido de campaña. No se da por auditada perceptualmente la reproducción de los 126 clips, ni se completa la aceptación integrada de audio. Un cambio posterior de ruta/contexto debe regenerar/revisar este informe y obtener la evidencia runtime pertinente antes de cerrar ese uso.

Verificación terminal: 192/192 pruebas dirigidas PASS en 2165.58 ms (auditor, routing, UI, estructuras, contactos/granja, bestias, ambiente, movimiento, trabajadores, cooldown/desbloqueos, destrucción y lifecycle del retrato). `--check`, syntax y diff --check PASS. `verify_sfx_runtime.mjs` PASS: 126 SFX, tres metadatos derivados, hashes/exports válidos; originales6594101bytes y runtime4982234bytes. Logs junto a esta nota. No se ejecutó build nuevo porque no cambió código de producción ni packaging; no se toma una compilación histórica como validación de este commit.
