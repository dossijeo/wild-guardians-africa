from pathlib import Path
import hashlib

source = Path('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js').read_text(encoding='utf-8')
start = source.index('   const bins=[[],[],[]],offX=')
end = source.index('   const order=bins.flat()', start)
body = source[start:end]
output = "// Original Bioma Lab V4.0 updateAssetLods distance selection, verbatim.\n"
output += f"export const LOD_SOURCE_SHA256='{hashlib.sha256(source.encode()).hexdigest()}';\n"
output += "export function nativeLodBins(instances,prototype,group,eye,quality,levels){\n"
output += " const b={instances,group,slot:0,variants:Array(levels)},prototypes=[prototype],cam={eye},mode='terrain';\n"
output += " const state={assetLOD:true,quality:quality==='alta'?'high':['muy_baja','baja'].includes(quality)?'eco':'normal'};\n"
output += body + " return bins;\n}\n"
Path('src/rendering/lod-source.js').write_bytes(output.encode('utf-8'))
