"""Stage the four user-supplied comparison GLBs without changing production assets."""
import argparse, hashlib, json, zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('zip');args=p.parse_args()
root=Path(__file__).resolve().parents[2]/'docs/lighting/tree-lod-review'
rows=json.loads((root/'inspection.json').read_text())
with zipfile.ZipFile(args.zip) as z:
 for row in rows:
  name=f"tree_0{row['tree']}_hd.glb"
  data=z.read(name)
  if hashlib.sha256(data).hexdigest()!=row['sha256']:raise ValueError('Different source: '+name)
  (root/name).write_bytes(data)
print('Open /tests/browser/tree-lod-review.html on the Vite dev server.')
