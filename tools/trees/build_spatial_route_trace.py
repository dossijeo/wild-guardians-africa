"""Build a diagnostic WASM with lazy route tracing; never replaces production."""
import json
import os
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
script = (root / 'tools/build-spatial-savanna-wasm.sh').read_text(encoding='utf-8')
exports = json.loads(re.search(r"-s 'EXPORTED_FUNCTIONS=(\[.*?\])'", script).group(1))
exports += ['_lazy_route_trace_clear', '_lazy_route_trace_count', '_lazy_route_trace_ptr',
            '_lazy_local_route_trace_count', '_lazy_local_route_trace_ptr']
output = os.environ.get('SPATIAL_TRACE_OUTPUT', str(root / '.cache/spatial-route-trace.wasm'))
compiler = os.environ.get('EMXX', 'em++')
export_file = Path(output + '.exports.json')
export_file.parent.mkdir(parents=True, exist_ok=True)
export_file.write_text(json.dumps(exports, separators=(',', ':')), encoding='utf-8')
sources = ['spatial-savanna.cpp', 'lazy-sectors.cpp', 'spatial-route-planner.cpp',
           'spatial-action-planner.cpp', 'spatial-intent-state.cpp', 'spatial-dynamic-bodies.cpp']
command = [compiler, *(str(root / 'src/world/wild-engine' / name) for name in sources),
           '-DWILD_ROUTE_TRACE', '-std=c++17', '-O3', '-s', 'STANDALONE_WASM=1',
           '-s', 'ALLOW_MEMORY_GROWTH=1', '-s', 'INITIAL_MEMORY=16777216',
           '-s', 'EXPORTED_FUNCTIONS=@' + str(export_file),
           '--no-entry', '-o', output]
subprocess.run(command, cwd=root, check=True)
