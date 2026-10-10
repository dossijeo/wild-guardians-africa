import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('capacity', Path(__file__).parents[1] / 'tools/diagnose_native_raid_capacity.py')
capacity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capacity)


def fixture(damage=1, cap=3, hits=4, wounded=2):
    return {'raidEvidence': {'status': 'verified', 'coverageLost': False, 'raids': [{
        'day': 14, 'ended': True, 'exposureStatus': 'exact-native-spawn',
        'exposedLivingAtSpawn': 100, 'exposedWoundedAtSpawn': wounded,
        'agriculturalHpDamage': 4, 'cropsDestroyed': 2,
        'species': {'warthog': {'generated': 1, 'initialHitBudget': hits, 'unconsumedOrUnobservedBudget': 0}},
        'pressureFacts': {'introductory': False, 'potential': 1,
                          'referenceEnvelope': {'rows': [{'id': 'warthog', 'cropDamage': damage, 'areaCap': cap}]}}
    }]}}


class CapacityBounds(unittest.TestCase):
    def test_reference_lattice_is_not_used_as_universal_cap(self):
        row = capacity.capacity_rows(fixture())[0]
        self.assertEqual(row['referencePotentialHp'], 1)
        self.assertEqual(row['configuredHpUpper'], 8)
        self.assertEqual(row['optimisticStartCohortLossUpper'], 6)
        self.assertFalse(row['meetsOrientativeCapacity'])

    def test_central_and_peripheral_damage_are_clamped_to_plant_health(self):
        row = capacity.capacity_rows(fixture(damage=4, cap=7, hits=3))[0]
        self.assertEqual(row['configuredHpUpper'], 42)
        self.assertEqual(row['optimisticStartCohortLossUpper'], 23)

    def test_incomplete_or_unfinished_evidence_is_rejected(self):
        report = fixture()
        report['raidEvidence']['coverageLost'] = True
        with self.assertRaisesRegex(ValueError, 'coverage'):
            capacity.capacity_rows(report)
        report['raidEvidence']['coverageLost'] = False
        report['raidEvidence']['raids'][0]['ended'] = False
        with self.assertRaisesRegex(ValueError, 'completed raids'):
            capacity.capacity_rows(report)

    def test_missing_spawn_census_is_rejected(self):
        report = fixture()
        report['raidEvidence']['raids'][0]['exposedWoundedAtSpawn'] = None
        with self.assertRaisesRegex(ValueError, 'census'):
            capacity.capacity_rows(report)

    def test_damage_receipts_cannot_exceed_the_configured_cap(self):
        report = fixture()
        report['raidEvidence']['raids'][0]['agriculturalHpDamage'] = 9
        with self.assertRaisesRegex(ValueError, 'physical cap'):
            capacity.capacity_rows(report)

    def test_introductory_raids_are_not_calibrated_against_normal_curves(self):
        report = fixture()
        report['raidEvidence']['raids'][0]['pressureFacts']['introductory'] = True
        self.assertEqual(capacity.capacity_rows(report), [])


if __name__ == '__main__':
    unittest.main()
