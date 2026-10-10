"""Synthetic evidence-integrity tests; these do not execute the game."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from summarize_native_loading_pair import summarize


class SummaryIntegrity(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.receipt = {'complete': True, 'order': ['A', 'B', 'B', 'A'],
                        'executableSha256': 'a' * 64, 'fixtureSha256': 'b' * 64, 'runs': []}
        for index, mode in enumerate(self.receipt['order'], 1):
            directory = self.root / f'{index}-{mode}'
            directory.mkdir()
            ready = 20000 if mode == 'A' else 18000
            report = {'ok': True, 'errors': [], 'checks': {
                'visibility': {'passed': True, 'hiddenMs': 300100,
                               'hiddenStart': {'time': 1}, 'hiddenEnd': {'time': 1}},
                'loadingRecipe': {'cropPairOverlap': mode == 'B'},
                'loadingAtFinish': {'worldWaitMs': ready},
                'world': {'width': 1024, 'height': 576, 'biome': 'canyon', 'culture': 'mapungubwe'},
                'nativeLoadingTrace': {'droppedLabels': 0, 'droppedPending': 0,
                    'graphics': {'available': True, 'renderer': 'synthetic'},
                    'completed': ([{'label': 'load-crop-pair-join', 'count': 1,
                                    'failed': 0, 'totalElapsedMs': 10}] if mode == 'B' else [])}}}
            path = directory / 'desktop-smoke.json'
            path.write_text(json.dumps(report), encoding='utf8')
            self.receipt['runs'].append({'mode': mode, 'status': 'finished', 'exitCode': 0,
                'worldWaitMs': ready, 'reportSha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        self.save_receipt()

    def save_receipt(self):
        (self.root / 'receipt.json').write_text(json.dumps(self.receipt), encoding='utf8')

    def alter_report(self, change):
        path = self.root / '2-B' / 'desktop-smoke.json'
        report = json.loads(path.read_text())
        change(report['checks'])
        path.write_text(json.dumps(report), encoding='utf8')
        self.receipt['runs'][1]['reportSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.save_receipt()

    def test_complete_summary_does_not_rewrite_originals(self):
        before = {p: p.read_bytes() for p in self.root.rglob('*.json')}
        result = summarize(self.root)
        self.assertEqual(result['meanDifferenceBMinusAMs'], -2000)
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob('*.json')})

    def test_incomplete_rejected(self):
        self.receipt['complete'] = False
        self.save_receipt()
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            summarize(self.root)

    def test_tampered_original_rejected(self):
        with (self.root / '2-B' / 'desktop-smoke.json').open('a') as stream:
            stream.write(' ')
        with self.assertRaisesRegex(ValueError, 'digest'):
            summarize(self.root)

    def test_renderer_change_rejected(self):
        self.alter_report(lambda c: c['nativeLoadingTrace']['graphics'].update(renderer='other'))
        with self.assertRaisesRegex(ValueError, 'Renderer'):
            summarize(self.root)

    def test_join_missing_rejected(self):
        self.alter_report(lambda c: c['nativeLoadingTrace'].update(completed=[]))
        with self.assertRaisesRegex(ValueError, 'scheduling'):
            summarize(self.root)

    def test_hidden_change_rejected(self):
        self.alter_report(lambda c: c['visibility'].update(hiddenEnd={'time': 2}))
        with self.assertRaisesRegex(ValueError, 'simulation'):
            summarize(self.root)


if __name__ == '__main__':
    unittest.main()
