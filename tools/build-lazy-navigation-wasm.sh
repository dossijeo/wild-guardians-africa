#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
em++ src/world/hierarchical-wasm/lazy-sectors.cpp -std=c++17 -O3 \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=4194304 \
  -s 'EXPORTED_FUNCTIONS=["_lazy_init","_lazy_pass_ptr","_lazy_steps_ptr","_lazy_commit_sector","_lazy_connected","_lazy_route","_lazy_route_ptr","_lazy_loaded_sectors","_lazy_sector_updates"]' \
  -Wl,--no-entry -o src/world/hierarchical-wasm/lazy-sectors.wasm
