# Reproducir el experimento

Requisitos usados: Node 20.11.0, Chrome 155 y Playwright 1.64.1. Un navegador
con WebGPU físico y `timestamp-query` es necesario para el benchmark GPU.
El runner rechaza adaptadores software. Solo se ha probado este perfil Intel.

```powershell
npm ci --ignore-scripts
# Si Playwright no está disponible en otro entorno:
npm install --no-save --package-lock=false playwright@1.64.1
$env:WG_QA_PLAYWRIGHT_MODULE="$PWD/node_modules/playwright/index.mjs"
node tools/filament-evaluation/setup.mjs
node tools/filament-evaluation/serve.mjs
```

Mantener el servidor activo. En otra terminal, desde la misma raíz y con la
misma variable `WG_QA_PLAYWRIGHT_MODULE`:

```powershell
node tools/filament-evaluation/run.mjs
node tools/filament-evaluation/prepare.mjs
node tools/filament-evaluation/suite.mjs
```

`prepare.mjs` congela los GLB comunes y los descriptores dentro de `vendor/`,
excluido de Git. Comprueba triángulos/meshes antes y después de exportar, y
matrices de actores. La conversión no forma parte del render cronometrado.
`setup.mjs` verifica SHA256 del archivo web oficial y copia los dos materiales
precompilados versionados. No requiere recompilar Filament ni instalar matc
para repetir el experimento.

`suite.mjs` mide A/B y C nativa, intenta el control optimizado, conserva su fallo
si se reproduce y ejecuta el diagnóstico acotado, mide C expandida y realiza
los controles de recursos/cadencia sin instrumentación. El control optimizado
fallido se excluye del análisis numérico. Analizar únicamente resultados
completos:

```powershell
node tools/filament-evaluation/analyze.mjs docs/qa/filament-evaluation/results-native docs/qa/filament-evaluation/results-expanded
node tools/filament-evaluation/verify-results.mjs
```

El comando anterior genera `RESULTS.md` y `summary.json`. Los resultados
originales están versionados; una nueva ejecución los sustituye localmente.
No debe ejecutarse junto a builds, otras pruebas de GPU o simulaciones pesadas.
`verify-results.mjs` comprueba integridad de muestras, frames enviados,
triángulos de C, capturas y ausencia de errores, sin ejecutar GPU. Conserva
los hashes de índices en `VALIDATION.json`.

## Materiales

Los `.filamat` de `tools/filament-evaluation/materials/` se compilaron con matc
oficial v1.78.0, perfil mobile y backend webgpu. Sus fuentes `.mat` están junto
al harness. Para modificarlos:

```sh
MATC=/ruta/al/matc-o-wrapper sh tools/filament-evaluation/compile-materials.sh
```

La solución para ejecutar las herramientas oficiales en WSL Ubuntu 22.04 está
en [FEASIBILITY.md](FEASIBILITY.md). El script actual genera solo el backend
probado; agregar OpenGL al paquete de materiales requeriría compilar con
`-a opengl` adicional y validar ese backend antes de declarar un fallback.

SHA256 de los materiales medidos:

- `grass.filamat`: `22693476eced019aa88e7e86dea11d9a2dba1151cd0968a8f3c17b1104fc119e`.
- `grass-instanced.filamat`: `74150e03f63d9c13cd771daec8f85658b3565385e94f7f507bd3d2b90f36111f`.

## Verificación del juego existente

`npm run build` pasó (7,82 s), con el aviso existente de tamaño de chunks.
`npm run verify:browser-syntax` pasó. También pasaron 38 pruebas mediante:

```powershell
node --test tests/african-toon.test.js tests/assets-lifecycle.test.js tests/asset-surface.test.js tests/asset-shadows.test.js tests/render-gl-calls.test.js tests/render-cpu-calls.test.js tests/render-pass-timer.test.js tests/render-quality.test.js
```

La suite completa `npm test` se inició y se interrumpió durante simulaciones
largas de campañas QA-136; **no se cuenta como superada**. No se modificaron
fuentes del juego ni Wild Engine. Las pruebas GPU finales y sus controles se
ejecutaron fuera de ese tramo de carga de CPU.
