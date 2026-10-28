#!/bin/sh
# MATC may point to an official matc executable or a compatible local wrapper.
set -eu
: "${MATC:?Set MATC to the official Filament v1.78.0 matc executable or wrapper}"
task_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$task_dir/vendor" "$task_dir/materials"
for material in grass grass-instanced; do
  "$MATC" -a webgpu -p mobile \
    -o "$task_dir/materials/$material.filamat" "$task_dir/$material.mat"
  cp "$task_dir/materials/$material.filamat" "$task_dir/vendor/$material.filamat"
done
