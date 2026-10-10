"""Read-only summary of a completed run_native_loading_pair.ps1 comparison."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from statistics import mean


def require(condition, message):
    if not condition:
        raise ValueError(message)


def summarize(directory):
    directory = Path(directory).resolve()
    receipt_bytes = (directory / 'receipt.json').read_bytes()
    receipt = json.loads(receipt_bytes.decode('utf-8-sig'))
    require(receipt.get('complete') is True and not receipt.get('error'),
            'Comparison is incomplete or failed; retain original evidence')
    runs = receipt.get('runs', [])
    require(receipt.get('order') == ['A', 'B', 'B', 'A'] and
            [run.get('mode') for run in runs] == ['A', 'B', 'B', 'A'],
            'Expected exactly four A/B/B/A passes')
    rows, control = [], None
    for index, run in enumerate(runs, 1):
        require(run.get('status') == 'finished' and run.get('exitCode') == 0,
                'Pass did not terminate successfully')
        # Read from the owned directory, never an arbitrary receipt-supplied path.
        path = directory / f'{index}-{run["mode"]}' / 'desktop-smoke.json'
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        require(digest == run.get('reportSha256'), 'Original report digest mismatch')
        report = json.loads(raw.decode('utf-8-sig'))
        checks = report['checks']
        trace, visibility = checks['nativeLoadingTrace'], checks['visibility']
        require(report.get('ok') is True and not report.get('errors'), 'Native acceptance failed')
        require(visibility.get('passed') is True and visibility.get('hiddenMs', 0) >= 300000,
                'Original native hidden gate not satisfied')
        require(visibility['hiddenStart'] == visibility['hiddenEnd'], 'Hidden simulation changed')
        require(checks['loadingRecipe']['cropPairOverlap'] is (run['mode'] == 'B'),
                'Recipe does not match pass')
        require(trace.get('droppedLabels') == 0 and trace.get('droppedPending') == 0,
                'Phase attribution overflowed')
        phases = {phase['label']: phase for phase in trace['completed']}
        join = phases.get('load-crop-pair-join')
        require((join is not None) == (run['mode'] == 'B'), 'Actual scheduling evidence missing')
        if join:
            require(join['count'] == 1 and join['failed'] == 0, 'Crop join failed or repeated')
        graphics = trace['graphics']
        require(graphics.get('available') is True, 'Renderer identity missing')
        current = {'graphics': graphics, 'world': checks['world']}
        if control is None:
            control = current
        require(current == control, 'Renderer, viewport, biome or culture changed')
        ready = checks['loadingAtFinish']['worldWaitMs']
        require(isinstance(ready, (int, float)) and math.isfinite(ready) and 0 < ready <= 90000,
                'Original world-readiness gate not satisfied')
        require(ready == run.get('worldWaitMs'), 'Receipt readiness differs from original report')
        rows.append({'pass': index, 'mode': run['mode'], 'worldReadyMs': ready,
                     'hiddenMs': visibility['hiddenMs'], 'reportSha256': digest,
                     'cropPhasesMs': {name: phases[name]['totalElapsedMs'] for name in
                        ('load-crop-model', 'load-crop-bridges', 'load-crop-pair-join')
                        if name in phases}})
    averages = {mode: mean(row['worldReadyMs'] for row in rows if row['mode'] == mode)
                for mode in ('A', 'B')}
    return {'receiptSha256': hashlib.sha256(receipt_bytes).hexdigest(),
            'executableSha256': receipt['executableSha256'], 'fixtureSha256': receipt['fixtureSha256'],
            'passes': rows, 'control': control, 'meanReadyMs': averages,
            'meanDifferenceBMinusAMs': averages['B'] - averages['A'],
            'scope': 'Four local saved-world samples with fresh WebView2 profiles. OS/file/driver '
                     'caches remain warm. Descriptive difference only; not statistical acceptance, '
                     'GPU timing, frame stability, peak-memory or physical-input evidence. '
                     'Nested phase wall times must not be added as exclusive CPU/GPU time.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory')
    arguments = parser.parse_args()
    print(json.dumps(summarize(arguments.directory), indent=2))
