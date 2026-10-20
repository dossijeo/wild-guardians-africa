# Filament WASM + WebGPU — evaluación

**Resultado: [CONSERVAR THREE.JS + WEBGL2](DECISION.md).** Prueba mínima funcional,
48 bloques de benchmark y controles conservados. [Resultados](RESULTS.md),
[protocolo](PROTOCOL.md), [reproducción completa](REPRODUCE.md).

Base: `origin/main` actualizado el 2026-10-20, commit
`59fdb9459e6ab55718e2397aab83a0c1ebfcd428`. Rama exclusiva
`codex/filament-webgpu-migration`. No se modifica el renderizador principal.

Dependencia oficial: Filament v1.78.0, commit
`c1dc4e444784850d6dc891a1fb38747c30b85463`. Archivo web fijado por SHA256 en
`tools/filament-evaluation/dependency.json`. Sin fork ni cambios internos.

## Reproducción de la prueba mínima

Desde la raíz del worktree:

```powershell
node tools/filament-evaluation/setup.mjs
node tools/filament-evaluation/serve.mjs
# Otra terminal, con Playwright disponible:
$env:WG_QA_PLAYWRIGHT_MODULE='ruta/absoluta/playwright/index.mjs'
node tools/filament-evaluation/run.mjs
```

La página también se puede abrir manualmente en
`http://127.0.0.1:5296/tools/filament-evaluation/index.html`.
La prueba verifica adaptador físico, backend WEBGPU efectivo, envíos a la cola,
carga del GLB original de Kofi, plano, luz direccional, cámara móvil y animador
nativo. Captura y registro reales: `official-web/browser.png`, `result.json`.
Esta prueba funcional no es un benchmark ni autoriza la migración.

La inicialización solicita las capacidades opcionales que usa
`web/filament-js/utilities.js` del commit fijado. No habilitar
`rg11b10ufloat-renderable` en el dispositivo provocó errores de validación al
renderizar; el adaptador sí dispone de la capacidad. La prueba corregida termina
120 fotogramas sin errores. Las métricas de descarga se miden desde localhost,
por tanto sus tiempos no representan descarga por Internet.

## Evidencias previas reutilizadas

`codex/webgpu-renderer-evaluation`, commit `ad31e10dc`, protocolo final
`b0b4b406c`: Intel UHD Gen12LP, Chrome155, 1280×720 DPR1. En escena compleja
Three/WebGPU bajó tiempo GPU medido de 45,286–56,130 a 27,280–29,819 ms,
pero CPU de envío subió de 2,657–3,592 a 11,062–11,903 ms y el intervalo RAF
de 53,951–60,324 a 61,617–69,193 ms. Los temporizadores GPU no cubren el mismo
trabajo. Se conserva su decisión negativa y no se repiten sus pilotos.

El laboratorio `codex/global-visual-lab` en `4cad3cd2d` conserva cobertura C
Sabana, dos LOD medio / uno bajo y viento8 como prototipos. La cobertura Río
original sigue siendo la referencia. Variantes posteriores de continuidad/LOD
y wear-feather no están promovidas. `global-lighting` sigue siendo opcional,
sin presupuesto global aprobado. Arena vigente: normal-only AerialBeach01,
contorno de normal geométrica y especular seco. No se incorporan sombras
individuales de hierba ni radiancia continua del Desierto descartadas.
