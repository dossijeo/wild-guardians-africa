# Referencias y extracción

Los originales se conservan en `C:\Users\PC\Desktop\Wild Guardians New`.
`python tools/extract_assets.py --source <carpeta>` reproduce la extracción.
Los scripts de `extracted/` son referencias, no motores simultáneos de la partida.
Los JSON preservan las propiedades de origen y sustituyen los bytes embebidos
por referencias a binarios externos deduplicados por SHA-256 en `public/assets/`.
Un campo `{url, encoding: "external-binary"}` representa los bytes originales
base64 decodificados, no un cambio de geometría. Los datos gzip se descomprimen.
`content/manifests/assets.json` conserva origen, hashes, tamaños y clips GLB.

No se redistribuyen HTML completos de cientos de megabytes. No se consideran
los scripts de referencia código integrado hasta adaptarlos al renderer común.

