"""Recover native camera obstruction volumes and ordered screen coverage."""
from pathlib import Path
import hashlib
import json
root = Path(__file__).resolve().parents[1]
source = (root / 'references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js').read_text(encoding='utf-8')
helpers = source[source.index('const smooth='):source.index('const hex=')]
recipe = source[source.index('function obstructionRecord('):source.index('function syncVisibilityControls(')]
coverage = source[source.index('float coverageThreshold('):source.index('\nvoid main(){', source.index('float coverageThreshold('))]
output = '// Generated from Bioma Lab V4.0 by tools/prepare_obstruction.py.\n'
output += 'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\n' + helpers + recipe
output += 'export const OBSTRUCTION_SOURCE_SHA256=' + json.dumps(hashlib.sha256(source.encode()).hexdigest()) + ';\n'
output += 'export const coverageThreshold=' + json.dumps(coverage) + ';\nexport {obstructionRecord,obstructionFrame,obstructionVisibility};\n'
output = '\n'.join(line.rstrip() for line in output.split('\n'))
(root / 'src/rendering/obstruction-source.js').write_bytes(output.encode('utf-8'))
