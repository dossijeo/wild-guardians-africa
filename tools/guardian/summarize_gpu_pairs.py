"""Summarize QA frozen-frame GPU runs; descriptive differences, not game FPS."""
import argparse
import json
import statistics
from pathlib import Path

MODES = ('none', 'body', 'effects', 'all')

def summarize(path):
    data = json.loads(Path(path).read_text(encoding='utf-8-sig'))
    report = data.get('report', data)
    blocks = {}
    for sample in report['timer']['samples']:
        frame = sample['frame']
        if 40 <= frame < 280:
            mode = MODES[(frame + frame // 4) % 4]
            blocks.setdefault((frame - 40) // 4, {})[mode] = sample['ms']
    differences = [b['all'] - b['none'] for _, b in sorted(blocks.items()) if 'all' in b and 'none' in b]
    modes = {m['mode']: m for m in report['modes']}
    median = lambda values: statistics.median(values) if values else None
    return {
        'file': str(path), 'age': report['age'], 'pairedBlocks': len(differences),
        'pairedMedianMs': median(differences),
        'firstHalfMedianMs': median(differences[:len(differences)//2]),
        'secondHalfMedianMs': median(differences[len(differences)//2:]),
        'pairedMinMs': min(differences, default=None), 'pairedMaxMs': max(differences, default=None),
        'referenceGpuP50': modes['none']['gpuP50'], 'allGpuP50': modes['all']['gpuP50'],
        'referenceGpuP95': modes['none']['gpuP95'], 'allGpuP95': modes['all']['gpuP95'],
        'animationP95': modes['all'].get('animationP95'), 'vfxP95': modes['all'].get('vfxP95'),
        'referenceDraws': modes['none']['drawP95'], 'allDraws': modes['all']['drawP95'],
        'hiddenFrames': sum(m['hiddenFrames'] for m in modes.values()) if all('hiddenFrames' in m for m in modes.values()) else None,
        'timerQuality': {k: v for k, v in report['timer'].items() if k != 'samples'},
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', nargs='+', type=Path)
    args = parser.parse_args()
    print(json.dumps([summarize(path) for path in args.runs], indent=2))
