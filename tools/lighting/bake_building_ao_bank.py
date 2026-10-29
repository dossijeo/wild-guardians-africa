"""Bake all original building AO atlases with a pinned Blender executable."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--blender',required=True);p.add_argument('--culture',action='append');a=p.parse_args()
root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'content/manifests/destruction-native.json').read_text())
for building in manifest['buildings']:
 culture=building['culture']
 if a.culture and culture not in a.culture:continue
 source=root/('public'+building['url']);output=root/f'public/content/lighting/{culture}-geometric-ao.png'
 command=[a.blender,'--background','--python',str(root/'tools/lighting/bake_building_ao.py'),'--',str(source),str(output)]
 result=subprocess.run(command,cwd=root,capture_output=True,text=True,encoding='utf8',errors='replace')
 log=root/f'test-results/{culture}-ao-bake.log';log.parent.mkdir(exist_ok=True);log.write_text(result.stdout+result.stderr,encoding='utf8')
 if result.returncode or 'AO_BAKE_COMPLETE' not in result.stdout:raise RuntimeError(f'Bake failed: {log}')
 # AO output is achromatic data. Store one byte per texel without changing it.
 with Image.open(output) as image:
  red,green,blue=image.convert('RGB').split()
  if red.tobytes()!=green.tobytes() or red.tobytes()!=blue.tobytes():raise RuntimeError('AO is not grayscale')
  red.save(output,optimize=True)
 radius=float(result.stdout.split('AO_BAKE_COMPLETE',1)[1].split('radius',1)[1].split()[0])
 output.with_suffix('.json').write_text(json.dumps({'source':building['url'],'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'outputSHA256':hashlib.sha256(output.read_bytes()).hexdigest(),'tool':'tools/lighting/bake_building_ao.py','blender':'4.5.3','size':1024,'samples':32,'aoSamples':16,'distance':radius,'storage':'8-bit grayscale PNG','newExternalAsset':False,'scope':'Candidate for intact building; not dynamic cavity AO'},indent=2),encoding='utf8')
 print(culture,output.stat().st_size,flush=True)
