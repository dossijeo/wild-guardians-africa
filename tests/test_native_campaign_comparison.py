import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).parents[1] / 'tools/plot_native_campaign_comparison.py')
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


class EvidenceIntegrity(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.paths = [Path(self.tmp.name) / str(i) for i in range(2)]
        for path in self.paths:
            path.mkdir()
            self.save(path, 'receipt', {'status': 'observed-horizon', 'completedNights': 7})
            self.save(path, 'source', {'sourceHashes': {'runtime': 'same'}})
            self.save(path, 'report', dict(seed=712, biome='sabana', culture='mapungubwe', labourPolicy='q8',
                                          completedNights=7, daily=[{'finance': {'reconciliationDifference': 0}} for _ in range(7)],
                                          policy=dict(profile='olderFemale', cropPolicy='cashflow', defensePolicy='shore', defenseStartDay=6, plotFluidClearance=1.5)))

    def save(self, path, name, value):
        (path / (name + '.json')).write_bytes(json.dumps(value).encode('utf-8'))

    def modify(self, name, transform):
        path = self.paths[1]
        value = json.loads((path / (name + '.json')).read_text(encoding='utf-8'))
        transform(value)
        self.save(path, name, value)

    def test_matching_frozen_rules_are_comparable(self):
        self.assertEqual(len(comparison.collect(self.paths)), 2)

    def test_changed_crop_health_cannot_be_hidden(self):
        self.modify('report', lambda q: q.update(protocol={'cropHitPoints': 1}))
        with self.assertRaisesRegex(ValueError, 'crop resistance differs'):
            comparison.collect(self.paths)

    def test_running_campaign_is_not_completion(self):
        self.modify('receipt', lambda q: q.update(status='running'))
        with self.assertRaisesRegex(ValueError, 'terminal'):
            comparison.collect(self.paths)

    def test_source_changes_cannot_be_hidden_in_comparison(self):
        self.modify('source', lambda q: q['sourceHashes'].update(runtime='changed'))
        with self.assertRaisesRegex(ValueError, 'sources differ'):
            comparison.collect(self.paths)

    def test_mixed_seed_or_rule_configuration_is_rejected(self):
        self.modify('report', lambda q: q.update(seed=123))
        with self.assertRaisesRegex(ValueError, 'seed differs'):
            comparison.collect(self.paths)
        self.modify('report', lambda q: q.update(seed=712))
        self.modify('report', lambda q: q['policy'].update(plotFluidClearance=0))
        with self.assertRaisesRegex(ValueError, 'policy setting'):
            comparison.collect(self.paths)

    def test_unreconciled_ledger_is_not_plotted(self):
        self.modify('report', lambda q: q['daily'][0]['finance'].update(reconciliationDifference=1))
        with self.assertRaisesRegex(ValueError, 'ledger'):
            comparison.collect(self.paths)

    def test_disagreeing_completion_counts_are_rejected(self):
        self.modify('receipt', lambda q: q.update(completedNights=14))
        with self.assertRaisesRegex(ValueError, 'completed-night'):
            comparison.collect(self.paths)

    def test_missing_daily_evidence_is_rejected(self):
        self.modify('report', lambda q: q.update(daily=q['daily'][:6]))
        with self.assertRaisesRegex(ValueError, 'completed-night'):
            comparison.collect(self.paths)

    def test_material_difference_requires_declared_single_factor_experiment(self):
        for path in self.paths:
            q = json.loads((path / 'report.json').read_text(encoding='utf-8'))
            q['strategy'] = 'good'
            self.save(path, 'report', q)
        self.modify('report', lambda q: q['policy'].update(defenseMaterial='empalizada'))
        with self.assertRaisesRegex(ValueError, 'defenseMaterial differs'):
            comparison.collect(self.paths)
        self.assertEqual(len(comparison.collect(self.paths, vary_defense_material=True)), 2)
        self.modify('report', lambda q: q.update(strategy='no-shield'))
        with self.assertRaisesRegex(ValueError, 'preserve the player strategy'):
            comparison.collect(self.paths, vary_defense_material=True)

    def test_material_experiment_cannot_hide_a_second_rule_change(self):
        for path in self.paths:
            q = json.loads((path / 'report.json').read_text(encoding='utf-8'))
            q['strategy'] = 'good'
            self.save(path, 'report', q)
        self.modify('report', lambda q: q['policy'].update(defenseMaterial='empalizada', defenseStartDay=5))
        with self.assertRaisesRegex(ValueError, 'policy setting defenseStartDay differs'):
            comparison.collect(self.paths, vary_defense_material=True)


if __name__ == '__main__':
    unittest.main()
