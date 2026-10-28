# Despertares: registro de implementación y validación

## Procedencia y preparación

- Petición: `Texto pegado.txt`, adjunto del usuario; referencia conceptual: `despertares.zip`.
- Base: `origin/main`, `020dc1ea58857f3c0cdf154b62fc65bdd429cdea`.
- Rama: `feature/despertares-magia`, checkout separado para preservar los cambios ajenos del checkout original.
- Node 20.11.0; dependencias instaladas con `npm ci --no-audit --no-fund`.
- La primera tentativa de pruebas/build precedió a la instalación de dependencias: no es una referencia válida. Se conserva en `setup-incomplete-tests.txt`. La referencia válida se ejecuta después de instalar dependencias y antes de editar el runtime.
- Referencia completa: `node --test --test-concurrency=4 tests`, salida `baseline-tests.txt`. Build: `npm run build`, salida `baseline-build.txt`. Los resultados pendientes no se consideran aprobados.

## Arquitectura examinada

- `simulation/game.js`: comandos idempotentes, reloj de 600 s, amanecer, cola de tareas, crecimiento, cosecha y entrega física; `emit` publica a observadores síncronos y conserva solo 200 eventos recientes.
- `simulation/money.js`: fracciones exactas durante el cálculo y liquidación de monedas enteras mediante `transact`. El nuevo valor pasivo debe viajar en la caja y liquidarse una vez, nunca generar transferencias periódicas.
- `simulation/agricultural-power.js`: presupuestos diarios Grow/Multiply y compromisos por planta. Las bendiciones requieren modificadores separados, sin invocar hechizos repetidos ni modificar sus presupuestos.
- `simulation/crops.js`, `tasks.js`, planificador nativo: la fuente permanente debe excluirse de madurez, riego y tareas; al transformarse debe liberar tareas asignadas y notificar al planificador.
- `simulation/crop-impact-health.js`: punto compartido de daño agrícola, incluidas incursiones de área. Su validación de guardados debe evolucionar junto con la resistencia bendecida.
- `simulation/rules.js`, `raids.js`: daño estructural y atracción. La protección no debe cambiar geometría ni rutas; la atracción no debe incorporar el bonus monetario pasivo.
- `world/wall-layout.js`/`wall-layout-native.js`: extremos y grafo de módulos físicos. La protección contigua debe derivarse de conexiones físicas, no de centros próximos.
- `persistence/snapshots.js`: validación y serialización v1. Migración compatible y evaluación diaria persistida para impedir recompensas por recarga.
- `rendering/scene.js`, `crop-batch.js`: Wild Engine, instancias de cultivos y observadores existentes. `AfricanToon` aplica recetas compartidas a los materiales del terreno, con coordenadas de origen desplazable. Las raíces deben integrarse en esa superficie, sin duplicarla.
- `ui/native-hud.js`, `app/main.js`: distribución responsive y herramientas existentes; mantener Magia y Despertar independientes.

## Secuencia de trabajo

1. Progreso diario determinista, contadores de resultados, migración/validación y pruebas de cadencia.
2. Comando de bendición de plantas, influencia espacial invalidada por cambios, crecimiento/riego, cosecha física y daño.
3. Protección de módulos propios y conectados, reparación y pérdida.
4. Materiales de objetos, máscara de raíces sobre terreno existente y estados de VFX.
5. HUD en ambas orientaciones, herramienta cancelable y notificaciones existentes.
6. Comparaciones reproducibles y evidencia visual/perfilado real. Distinguir escenarios prescritos de decisiones autónomas y proyecciones matemáticas de campañas observadas.

## Estado

Referencia dirigida: **39/39 pruebas aprobadas**, `baseline-core.txt` (potencia agrícola, daño, guardado, murallas, replay). Build aprobado, `baseline-build.txt` (21,91 s; advertencia preexistente de bundle grande). La suite completa se interrumpió deliberadamente antes de integrar el runtime: 954 aprobaciones publicadas y ninguna conclusión global; no se presenta como suite aprobada.

Fase 1 integrada en `closeNight`, eventos reales, crecimiento físico y liquidación de microacontecimientos; evaluación persistida, historial diario auditable, carga única a 100 y migración perezosa sin premios retroactivos. **120/120 pruebas dirigidas aprobadas**, `phase1-integration.txt`. Las pruebas de cadencia son una proyección de puntos constantes; todavía no prueban el resultado de una campaña física ni su diversión. Parámetros y ponderaciones siguen siendo provisionales hasta fase 6.

Fase 2 integrada: comando idempotente `bless`, fuentes permanentes sin tareas ni riego, influencia espacial cacheada, +20 % crecimiento y +20 % valor base (superposición 20/10/5, máximo 35 %), +20 % tolerancia al riego, dos puntos de resistencia, destrucción y persistencia. El valor pasivo es `floor(base * porcentaje / 100)` por cosecha, se suma después de los modificadores ordinarios y se liquida mediante la entrega existente. Al destruir la fuente se invalida la influencia inmediatamente; las cajas ya cosechadas conservan su valor físico. La atracción conserva el valor base del objeto y no multiplica presión por los bonos. Una fuente sola no cuenta como cosecha disponible para el mínimo económico del amanecer.

**182/182 pruebas de integración aprobadas**, `phase2-integration.txt`; incluye replay, acontecimientos, impactos de área y contabilidad de potencia existente. **14/14 escenarios de plantas**, `phase2-plants.txt`. `phase2-native.txt` prueba Wild Engine/WASM real: se libera una tarea ya asignada, el planificador no vuelve a cosechar la fuente y el cultivo vecino se riega, recoge, transporta y entrega por 13 monedas (11 base + 2 pasivas), una vez. Build aprobado (17,82 s), `phase2-build.txt`. Es un escenario QA prescrito, todavía no una campaña autónoma ni una comparación de rentabilidad de 100 noches.

Fases 3–6 pendientes. El comando aún no se expone en la interfaz; la selección de murallas se completará con su protección en fase 3. Este documento se actualizará con resultados verificables, sin inferir éxito económico, gráfico o móvil a partir de comprobaciones parciales.
