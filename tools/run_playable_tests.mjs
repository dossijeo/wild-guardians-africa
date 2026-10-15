// Temporary release gate for the provisional magic/raid rules. Keep `npm test`
// available as the full historical suite while its superseded assertions are
// migrated to the new mechanics.
import { spawnSync } from 'node:child_process';

const tests = [
  'agricultural-magic-policy.test.js',
  'agricultural-power.test.js',
  'agricultural-single-plant.test.js',
  'agricultural-spirit-voices.test.js',
  'canyon-natural-defense.test.js',
  'crop-impact-health.test.js',
  'manual-magic-activity.test.js',
  'raid-agricultural-impact.test.js',
  'raid-contention-turns.test.js',
  'raid-desert-deadlock.test.js',
  'raid-individual-reservations.test.js',
  'raid-pressure-budget.test.js',
  'raid-pressure-lifecycle.test.js',
  'raid-pressure-plan.test.js',
  'raid-saheliana-exit.test.js',
  'tutorial-agricultural-guide.test.js',
  'village-expansion-price.test.js',
  'worker-wall-overlap-recovery.test.js',
  'worker-fractional-connector.test.js',
  'spatial-task-event-planning.test.js',
  'game-juice.test.js',
  'desktop-exit.test.mjs',
  'menu-library-fullscreen.test.js',
];

const result = spawnSync(process.execPath, ['--test', ...tests.map((name) => `tests/${name}`)], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
