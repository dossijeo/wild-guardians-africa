#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
em++ src/world/hierarchical-wasm/spatial-savanna.cpp src/world/hierarchical-wasm/lazy-sectors.cpp -std=c++17 -O3 \
  -s STANDALONE_WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=4194304 \
  -s 'EXPORTED_FUNCTIONS=["_spatial_generate","_spatial_add_chunk","_spatial_select_chunk","_spatial_remove_chunk","_spatial_chunk_count","_spatial_set_settlement","_spatial_add_settlement","_spatial_sector_slots","_spatial_surface","_spatial_heights_ptr","_spatial_colors_ptr","_spatial_water_ptr","_spatial_ground_mask_ptr","_spatial_water_levels_ptr","_spatial_water_triangles_ptr","_spatial_water_vertex_count","_spatial_props_ptr","_spatial_prop_count","_spatial_halo_prop_count","_spatial_build_nav","_spatial_select_nav_profile","_spatial_add_wall","_spatial_remove_wall","_spatial_walkable","_spatial_edge","_spatial_prop_blocked","_lazy_route","_lazy_route_ptr","_lazy_loaded_sectors","_lazy_sector_updates"]' \
  -Wl,--no-entry -o src/world/hierarchical-wasm/spatial-savanna.wasm
