"""Recover Bastion's path sampling, sockets and deterministic enclosure graph."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'references/extracted/Bastion_Lab_V4_1_Puerta_Reforzada_Mas_Grande/script-2.js'
code=source.read_text(encoding='utf-8')
helpers=code[code.index('function pointSegment('):code.index('class BastionApp')]
methods=code[code.index(' endpoints(p){'):code.index(' beginCollapse(')]
methods=methods.replace('\n closedFaces(){',',\n closedFaces(){').replace('\n ensureAutomaticGates(){',',\n ensureAutomaticGates(){')
snap=code[code.index(' snap(point){'):code.index('  buildStroke(')]
prefix="export const WALL_UNIT=2.18;\nconst UNIT=WALL_UNIT,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);\nconst gateScale=(material,kind='gate')=>kind==='gate'?({adobe:1.4,piedra:1.4,reforzado:1.6}[material]||1):1;\n"
module='// Generated from original Bastion V4.1 by tools/prepare_wall_layout.py.\n'+prefix+helpers+'export const nativeWallLayout={\n'+snap+',\n'+methods+'};\nexport {simplify,smoothPath,resample};\n'
target=root/'src/world/wall-layout-native.js'
target.write_text(module,encoding='utf-8',newline='\n')
(root/'content/manifests/wall-layout-native.json').write_text(json.dumps({'source':source.relative_to(root).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'moduleSha256':hashlib.sha256(target.read_bytes()).hexdigest()},indent=2)+'\n',encoding='utf-8',newline='\n')
