#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source "${EMSDK_ENV_SCRIPT:-/opt/emsdk/emsdk_env.sh}" >/dev/null
python3 - <<'PY'
from pathlib import Path
import subprocess

source = Path('tools/build-spatial-savanna-wasm.sh').read_text()
source = source.replace('cd "$(dirname "$0")/.."', '')
source = source.replace('src/world/hierarchical-wasm/lazy-sectors.cpp',
                        'tools/experiments/nav-cache-prototype.cpp')
source = source.replace('"_lazy_connected_reason"',
    '"_nav_cache_reset","_nav_cache_clear_metrics","_nav_cache_entries",'
    '"_nav_cache_hits","_nav_cache_misses","_nav_cached_connected",'
    '"_nav_cached_route","_nav_cache_total_entries","_nav_cache_total_hits",'
    '"_nav_cache_total_misses","_lazy_connected_reason"')
source = source.replace('-o src/world/hierarchical-wasm/spatial-savanna.wasm',
                        '-o tools/experiments/nav-cache-prototype.wasm')
subprocess.run(['bash', '-c', source], check=True)
PY
