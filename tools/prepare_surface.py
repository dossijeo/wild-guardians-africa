"""Extract the original atlas tangent and surface classification recipes."""
from pathlib import Path
import hashlib
import json
root=Path(__file__).resolve().parents[1]
source=(root/'references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js').read_text(encoding='utf-8')
helpers=source[source.index('const add='):source.index('const hex=')]
tangents=source[source.index('function computeTangents('):source.index('function validateAssetProfile(')]
surface=source[source.index('function describeSurface('):source.index('function smoothTerrainLighting(')]
output='// Generated from Bioma Lab V4.0 by tools/prepare_surface.py.\n'+helpers+tangents+surface
output+='export const SURFACE_SOURCE_SHA256='+json.dumps(hashlib.sha256(source.encode()).hexdigest())+';\nexport {computeTangents,describeSurface};\n'
output='\n'.join(line.rstrip() for line in output.split('\n'))
(root/'src/rendering/surface-source.js').write_bytes(output.encode('utf-8'))
