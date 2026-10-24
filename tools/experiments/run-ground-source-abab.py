"""Paired total-load comparison. No GL inventory wrappers in timing runs."""
import argparse, os, subprocess
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--prefix',required=True)
p.add_argument('--biome',default='manglares')
args=p.parse_args()
root=Path(__file__).resolve().parents[2]
out=root/'docs/qa/loading-production-variants'
reports=[out/(args.prefix+'-'+run+'.json') for run in ['a1','b1','a2','b2']]
for report in reports:
    if report.exists() or report.with_suffix('.failure.json').exists():
        raise SystemExit('Refusing to overwrite '+str(report))
for report in reports:
    run=report.stem.rsplit('-',1)[1]
    env={k:v for k,v in os.environ.items() if not k.startswith('WG_')}
    env.update(WG_THREAD_PORT='5190',WG_THREAD_BIOME=args.biome,
               WG_THREAD_DEFAULT_STREAMING='1',WG_THREAD_FROZEN='1',
               WG_FRAME_SCHEDULER='1',WG_THREAD_LOADING_FRAMES='1',
               WG_THREAD_LOADING_TIMES='1',WG_THREAD_LOADING_CAPTURE='1',
               WG_GUARDIAN_TAIL='1',WG_THREAD_REPORT=str(report))
    if run.startswith('b'):env['WG_PRODUCTION_GROUND_SOURCE']='1'
    with report.with_suffix('.log').open('wb') as log:
        result=subprocess.run(['node','tools/experiments/check-spatial-thread-game.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
    print(run,'exit',result.returncode,flush=True)
