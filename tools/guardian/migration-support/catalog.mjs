// Supporting index, never an authority or a second migration plan.
export const authority = [
  'docs/guardian/MIGRATION-OBJECTIVE.md',
  'docs/guardian/integrated-gpu-migration-plan-20261104.md',
  'docs/guardian/A6-CHECKLIST.md',
  'docs/guardian/intent-route-architecture-correction-20261108.md',
];
export const guards = [
  'tests/spatial-intent-transition-protocol.test.js',
  'tests/spatial-native-route-reservations.test.js',
  'tests/spatial-native-causal-clock.test.js',
  'tests/native-intent-control-cohort.test.js',
  'tests/native-barrier-quiescence.test.js',
  'tests/native-admission-vertical.test.js',
  'tests/native-world-boundary.test.js',
  'tests/native-route-control.test.js',
  'tests/webgpu-resource-registry.test.js',
];
const first = 'tools/guardian/audit_native_first_task_world_owner.mjs';
const worker = 'tools/guardian/audit_native_worker_world_owner.mjs';
export const scenarios = {
  harvest: {
    description: 'Contratación y dos cosechas con Carry y entrega sobre el mismo cuerpo en el recorrido ordinario.',
    tests: ['native-task-resource-requests', 'native-task-start-graphics', 'native-task-game-execution',
      'native-task-action-graphics', 'native-task-action-game-execution', 'native-intent-production-authority'],
    browser: 'tools/guardian/audit_native_farm_birth_world_owner.mjs',
    env: {
      QA_NATIVE_BIRTH_SCENARIO:'cancel-before-task',QA_NATIVE_EXISTING_PROFILE:'youngMale',QA_NATIVE_NEWBORN_PROFILE:'youngMale',
      QA_NATIVE_BIRTH_FOLLOW_ACTION:'true',QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE:'true',
      QA_NATIVE_BIRTH_FOLLOW_SETTLEMENT:'true',QA_NATIVE_BIRTH_FOLLOW_NEXT_TASK:'true',
    },
    evidence: 'docs/guardian/performance/native-post-settlement-second-delivery-20261121.json',
    pending: ['Puertas con egreso ocupado y resolución de tráfico en el recorrido completo',
      'Guardado y recuperación en ruta, acción y consecuencia', 'Activación ordinaria y C4 a 60 FPS'],
  },
  obstacles: {description:'Muro/props: invalidación dirigida y veto previo; componente nativo.', tests:['spatial-native-static-mutations','spatial-native-prop-mutations'], pending:['Combinar obstáculo con el ciclo Harvest completo']},
  gates: {description:'Dos puertas, suspensión, obstáculo, reanudación determinista; personaje original en ensayo GPU separado.', tests:['spatial-native-gate-route-acceptance','spatial-native-gate-crossings'], browser:worker, env:{QA_GATE_WAIT:'true',QA_GATE_MOTOR:'true'}, pending:['Puertas dentro de la misma partida Harvest ordinaria']},
  concurrent: {description:'Dos trabajadores; B avanza durante preparación y acción de A.', tests:['native-task-game-execution','spatial-native-route-reservations'], browser:first, env:{QA_NATIVE_ACTION:'true'}, pending:['Tráfico resuelto entre tareas ordinarias completas']},
  pause: {description:'Pausa/tasa y frontera ejecutada; sin temporizador JS de acción.', tests:['native-task-action-game-execution','spatial-native-causal-clock'], pending:['Pausa/tasa durante consecuencia y siguiente tarea integradas']},
  invalidation: {description:'Cancelación/preparación tardía y cambios durante drenaje en la admisión compartida.', tests:['native-admission-vertical','native-route-control','native-task-action-binding'], pending:['Invalidación en todas las fases de la vertical completa']},
  preparation: {description:'Bloqueo real de 1.800 ms (superior a 500 ms), dibujo durante espera y paquete retenido.', tests:['native-resource-preparation-channel','native-task-action-graphics'], browser:first, env:{QA_NATIVE_ACTION:'true'}, pending:['Consecuencia preparada con bloqueo en partida ordinaria']},
  recovery: {description:'Canal silencioso, relevo y device loss en harness existente; progreso semántico en Game.', tests:['native-task-action-game-execution','native-intent-control-cohort'], browser:'tools/guardian/audit_native_control_lifecycle.mjs', env:{}, pending:['Save/restore y recuperación a lo largo del ciclo Harvest completo; consultar cambios de Sol en restauración']},
};
export const testPath = name => `tests/${name}.test.js`;
export const integrationTests = [...new Set(Object.values(scenarios).flatMap(s=>s.tests.map(testPath)))];
export const isolationKeys = ['QA_NATIVE_ACTION','QA_RESTORE_ACTION','QA_RUNNING_TRANSITION','QA_CARRYING','QA_DEFERRED_RESUME','QA_RESUME_SUSPENSION','QA_TERRAIN_SUSPENSION','QA_GATE_WAIT','QA_GATE_MOTOR','QA_AUDIT',
  'QA_NATIVE_BIRTH_SCENARIO','QA_NATIVE_BIRTH_COUNT','QA_NATIVE_EXISTING_PROFILE','QA_NATIVE_NEWBORN_PROFILE',
  'QA_NATIVE_BIRTH_FOLLOW_ACTION','QA_NATIVE_BIRTH_FOLLOW_CONSEQUENCE','QA_NATIVE_BIRTH_FOLLOW_SETTLEMENT',
  'QA_NATIVE_BIRTH_FOLLOW_HOME','QA_NATIVE_BIRTH_FOLLOW_NEXT_TASK','QA_NATIVE_BIRTH_PAUSE_CARRY'];
