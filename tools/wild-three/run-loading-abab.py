"""Run after starting stock:5196 and patched:5197. Writes a NEW report prefix."""
import argparse,os,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--fixture',required=True);p.add_argument('--prefix',required=True);args=p.parse_args()
root=Path(__file__).resolve().parents[2];out=root/'docs/qa/wild-three-resource-control'
if not Path(args.fixture).is_file():raise SystemExit('Missing fixture')
for run in ['a1','b1','a2','b2']:
 report=out/(args.prefix+'-'+run+'.json')
 if report.exists() or report.with_suffix('.failure.json').exists():raise SystemExit('Refusing to overwrite '+str(report))
 env={k:v for k,v in os.environ.items() if not k.startswith(('WG_THREAD_','WG_GUARDIAN_','WG_FRAME_','WG_TEXTURE_'))}
 env.update(WG_THREAD_PORT='5197' if run.startswith('b') else '5196',WG_THREAD_DEFAULT_STREAMING='1',WG_THREAD_FROZEN='1',WG_FRAME_SCHEDULER='1',WG_THREAD_LOADING_FRAMES='1',WG_GUARDIAN_TAIL='1',WG_THREAD_FIXTURE_FILE=str(Path(args.fixture).resolve()),WG_THREAD_REPORT=str(report))
 if run.startswith('b'):env['WG_TEXTURE_LOADING_PILOT']='regions'
 with report.with_suffix('.log').open('wb') as log:
  result=subprocess.run(['node','tools/experiments/check-spatial-thread-game.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 print(run,'exit',result.returncode,flush=True)
 # Preserve failures and continue the interleaved control; never report a failed load as success.
