# Suite completa con Wild Engine nativo activado

La suite por defecto pasó en la [auditoría anterior](full-suite-2026-10-19/README.md), pero omitió 60 pruebas que solo se activan al seleccionar un binario WASM. La ejecución conjunta en Windows, sobre el árbol de `main` `0f9a1afa3151b15fe22bce7a4f6cd547f1545140`, seleccionó el binario de producción `src/world/wild-engine/spatial-savanna.wasm` para rutas, servicios espaciales y corte topológico. Resultado: **4.529 aprobadas, cero fallidas, cero omitidas**, 423,1 segundos.

Reproducción en PowerShell desde la raíz del repositorio:

```powershell
$wasm=(Resolve-Path 'src/world/wild-engine/spatial-savanna.wasm').Path
$env:WILD_ENGINE_NATIVE_ROUTE_WASM=$wasm
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=$wasm
$env:WILD_ENGINE_TOPOLOGICAL_CUT_WASM=$wasm
npm test
```

El SHA-256 del binario fue `674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`. Las 96 pruebas dirigidas correspondientes también habían pasado por separado (78 de rutas/servicios y 18 de recintos). El nuevo gate de CI utiliza ese mismo binario versionado; la PR verifica por primera vez el conjunto unido en Linux. No se modifican el juego ni el WASM. Esta cobertura Node no sustituye pruebas de teléfono físico, rendimiento WebGL o escucha perceptual de QA-014 y QA-156.
