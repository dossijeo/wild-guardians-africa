"""Generate isolated stock/patched r180 source copies; never edits node_modules."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--eager-state',action='store_true');options=parser.parse_args()
patch='r180-resource-control-eager-state.patch' if options.eager_state else 'r180-resource-control.patch'
root=Path(__file__).resolve().parents[2]
source=root/'tools/wild-three/node_modules/three'
manifest=json.loads((root/'docs/qa/wild-three-resource-control/upstream-r180.json').read_text())
assert json.loads((source/'package.json').read_text())['version']==manifest['version']
for name,digest in manifest['files'].items():
 if hashlib.sha256((source/name).read_bytes()).hexdigest()!=digest:raise RuntimeError('Upstream mismatch: '+name)
for mode in ['stock','patched']:
 target=root/'.cache/wild-three'/mode
 shutil.copytree(source/'src',target/'src',dirs_exist_ok=True)
 shutil.copy2(source/'LICENSE',target/'LICENSE')
 for name in manifest['files']:
  p=target/name;p.write_text(p.read_text(encoding='utf-8'),encoding='utf-8',newline='')
 if mode=='patched':
  args=['git','apply','--directory=.cache/wild-three/patched','tools/wild-three/'+patch]
  subprocess.run(args[:2]+['--check']+args[2:],cwd=root,check=True)
  subprocess.run(args,cwd=root,check=True)
 print(mode,target)
