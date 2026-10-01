"""Extract the original pure terrain/scatter algorithms as an ES module."""
import pathlib
root=pathlib.Path(__file__).resolve().parents[1]
source=(root/'references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js').read_text(encoding='utf-8')
lines=source.splitlines()
header='\n'.join(lines[3:38]).replace('const $=id=>document.getElementById(id), clamp=', 'const clamp=')
body=source[source.index('function canyonFrame('):source.index('// === MATRICES') if '// === MATRICES' in source else source.index('function mm(')]
# The pure segment includes terrain and deterministic scatter, no renderer/UI.
body=body[:body.index('function mm(')] if 'function mm(' in body else body
out=root/'src/world/terrain.js'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text('// Adapted without changing terrain/scatter constants from BIOMA V4.0.\n'+header+'\nconst num=v=>Number(v.toFixed(4));\n'+body+'\nexport {TerrainField,scatterWorld,hashString,hashCell,noise,rand,SLOTS,GROUPS,hex,canyonGroundColor,desertGroundColor};\n',encoding='utf-8')

