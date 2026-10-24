"""Initial readiness waves: identical P2 renderer, ordinary texture uploads."""
import argparse, os, subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--fixture', required=True)
p.add_argument('--prefix', required=True)
args = p.parse_args()
root = Path(__file__).resolve().parents[2]
out = root / 'docs/qa/wild-three-resource-control'
fixture = Path(args.fixture).resolve()
if not fixture.is_file():
    raise SystemExit('Missing fixture')
reports = [out / (args.prefix + '-' + run + '.json') for run in ('a1', 'b1', 'a2', 'b2')]
for report in reports:
    if report.exists() or report.with_suffix('.failure.json').exists():
        raise SystemExit('Refusing to overwrite ' + str(report))
for report in reports:
    run = report.stem.rsplit('-', 1)[1]
    env = {k: v for k, v in os.environ.items() if not k.startswith('WG_')}
    env.update(WG_THREAD_PORT='5197', WG_THREAD_DEFAULT_STREAMING='1',
               WG_THREAD_FROZEN='1', WG_FRAME_SCHEDULER='1',
               WG_THREAD_LOADING_FRAMES='1', WG_THREAD_LOADING_TIMES='1',
               WG_THREAD_LOADING_CAPTURE='1', WG_GUARDIAN_TAIL='1',
               WG_LOADING_COMPILE_CONCURRENCY='4' if run.startswith('b') else '1',
               WG_THREAD_FIXTURE_FILE=str(fixture), WG_THREAD_REPORT=str(report))
    with report.with_suffix('.log').open('wb') as log:
        result = subprocess.run(['node', 'tools/experiments/check-spatial-thread-game.mjs'],
                                cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
    print(run, 'exit', result.returncode, flush=True)
