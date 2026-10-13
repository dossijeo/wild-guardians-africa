#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
em++ src/world/hierarchical-wasm/core.cpp -std=c++17 -O3 \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=4194304 \
  -s 'EXPORTED_FUNCTIONS=["_nav_init","_nav_pass_ptr","_nav_steps_ptr","_nav_diag_ptr","_nav_commit","_nav_refresh","_nav_clear_portals","_nav_add_portal","_nav_commit_portals","_nav_component","_nav_route","_nav_route_flat","_nav_route_ptr","_nav_sectors_built","_nav_graph_nodes","_nav_local_nodes","_nav_flat_nodes","_nav_arc_count","_nav_cell_count"]' \
  -Wl,--no-entry -o src/world/hierarchical-wasm/core.wasm
