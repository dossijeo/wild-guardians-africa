param([string]$Emsdk = 'C:/Users/PC/tools/emsdk')
$ErrorActionPreference='Stop'
& "$Emsdk/upstream/emscripten/em++.exe" src/rendering/wild-renderer/core.cpp src/rendering/wild-renderer/packed-props.cpp -std=c++17 -O3 -ffp-contract=off -sSTANDALONE_WASM=1 -sALLOW_MEMORY_GROWTH=0 -sINITIAL_MEMORY=67108864 '-sEXPORTED_FUNCTIONS=["_wr_pack","_wr_noop","_wr_register","_wr_select","_wr_select_checked","_wr_props","_malloc","_free"]' '-Wl,--no-entry' -o src/rendering/wild-renderer/core.wasm
if($LASTEXITCODE -ne 0){throw 'Wild Renderer compilation failed'}
