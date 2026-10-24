"""Serial diagnostic inventory; never runs GPU benchmarks simultaneously."""
import argparse, os, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / 'docs/qa/loading-production-variants'
parser=argparse.ArgumentParser()
parser.add_argument('--candidate',action='store_true')
parser.add_argument('--quality',choices=['baja','media','alta'],default='media')
args=parser.parse_args()
biomes=['sabana','gran-rio','manglares','desierto','volcanes','gran-canon'] if args.candidate else ['sabana','gran-rio','desierto','volcanes','gran-canon']
for biome in biomes:
    suffix='pruned-'+args.quality+'-inventory' if args.candidate else 'baseline-inventory'
    report = out / (biome + '-'+suffix+'.json')
    if report.exists() or report.with_suffix('.failure.json').exists():
        raise SystemExit('Refusing to overwrite ' + str(report))
    env = {k: v for k, v in os.environ.items() if not k.startswith('WG_')}
    env.update(WG_THREAD_PORT='5190', WG_THREAD_BIOME=biome,
               WG_THREAD_QUALITY=args.quality,
               WG_THREAD_DEFAULT_STREAMING='1', WG_THREAD_FROZEN='1',
               WG_FRAME_SCHEDULER='1', WG_THREAD_LOADING_FRAMES='1',
               WG_THREAD_LOADING_TIMES='1', WG_LOADING_PROGRAM_INVENTORY='1',
               WG_GUARDIAN_TAIL='1', WG_THREAD_REPORT=str(report))
    if args.candidate:
        env.update(WG_PRODUCTION_GROUND_SOURCE='1',WG_THREAD_LOADING_CAPTURE='1')
    with report.with_suffix('.log').open('wb') as log:
        result = subprocess.run(['node', 'tools/experiments/check-spatial-thread-game.mjs'],
                                cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
    print(biome, 'exit', result.returncode, flush=True)
