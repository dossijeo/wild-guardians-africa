"""Serial current-recipe resident benchmark; no legacy streaming policy overrides."""
import argparse, hashlib, json, os, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--biome', required=True, choices=['sabana','gran-rio','manglares','desierto','volcanes','gran-canon'])
parser.add_argument('--quality', default='media', choices=['baja','media'])
parser.add_argument('--night', action='store_true')
parser.add_argument('--runs', nargs=2, default=['r1','r2'])
args = parser.parse_args()
assert len(set(args.runs)) == 2 and all(r.isalnum() for r in args.runs)
out = root / 'docs/qa/global-visual-lab/current-review-20261025/current-resident-cost'
out.mkdir(exist_ok=True)
files = ['src/rendering/scene.js','src/rendering/african-toon.js','tools/experiments/global-current-review-recipe.mjs','tools/experiments/check-spatial-thread-game.mjs']
suffix = '-night' if args.night else ''
pose = None
if args.night:
    day = json.loads((out / f'{args.biome}-{args.quality}-default-r1.json').read_text(encoding='utf-8'))['result']['streaming']
    pose = out / f'{args.biome}-{args.quality}-night-pose.json'
    value = {'camera':day['cameraOrigin'],'target':day['targetOrigin'],'time':350}
    if pose.exists():
        assert json.loads(pose.read_text(encoding='utf-8')) == value
    else:
        with pose.open('w',encoding='utf-8',newline='\n') as f: json.dump(value,f,indent=2)
for run in args.runs:
    report = out / f'{args.biome}-{args.quality}-default{suffix}-{run}.json'
    if report.exists() or report.with_suffix('.failure.json').exists():
        if report.exists() and args.runs != ['r1','r2']:
            print('Preserving completed report:', report.name, flush=True)
            continue
        raise SystemExit('Refusing overwrite: ' + str(report))
    env = {k:v for k,v in os.environ.items() if not k.startswith('WG_')}
    env.update(WG_THREAD_PORT='5190', WG_CURRENT_REVIEW='1', WG_THREAD_BIOME=args.biome,
               WG_THREAD_QUALITY=args.quality, WG_THREAD_FROZEN='1', WG_THREAD_RETAIN_APP='1',
               WG_THREAD_DEFAULT_STREAMING='1', WG_FRAME_SCHEDULER='1', WG_THREAD_BENCH='1',
               WG_THREAD_GPU='1', WG_THREAD_FRAMES='360', WG_THREAD_DISTANCE='0', WG_THREAD_REPORT=str(report))
    if pose: env['WG_THREAD_POSE_FILE'] = str(pose)
    with report.with_suffix('.sources.json').open('w',encoding='utf-8',newline='\n') as f:
        json.dump({p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files},f,indent=2)
    with report.with_suffix('.log').open('wb') as log:
        result = subprocess.run(['node','tools/experiments/check-spatial-thread-game.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
    print(run, 'exit', result.returncode, flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
