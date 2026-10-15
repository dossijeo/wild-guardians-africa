# Informes de campañas con avisos de protección

Los seis informes de más de 100 KiB se conservan como JSON UTF-8 comprimido con gzip. La compresión es reversible; no se eliminaron campos ni se resumieron filas. [`compressed-report-manifest.json`](compressed-report-manifest.json) registra el SHA-256 y el tamaño de los bytes originales y comprimidos de cada informe. Los pilotos breves permanecen como JSON directamente legible.

Para leer un informe comprimido sin modificarlo:

```sh
python -c "import gzip,json,sys; print(json.dumps(json.loads(gzip.decompress(open(sys.argv[1],'rb').read())),indent=2))" docs/qa/wild-engine-crop-protection-evidence/thirty-night-good-manglares-2026.json.gz
```

Para verificar los hashes de todos los informes:

```sh
python -c "import gzip,hashlib,json,pathlib; p=pathlib.Path('docs/qa/wild-engine-crop-protection-evidence'); m=json.loads((p/'compressed-report-manifest.json').read_text()); assert all(hashlib.sha256((b:=(p/r['file']).read_bytes())).hexdigest()==r['gzipSha256'] and len(b)==r['gzipBytes'] and hashlib.sha256((raw:=gzip.decompress(b))).hexdigest()==r['rawSha256'] and len(raw)==r['rawBytes'] for r in m['reports']); print('Informes íntegros')"
```

El ámbito, las conclusiones y las limitaciones de estas pruebas se explican en [`wild-engine-crop-protection-events.md`](../wild-engine-crop-protection-events.md). Un informe solicitado a 60 noches terminó por una derrota auténtica tras la noche 44; el nombre del archivo indica el horizonte solicitado, no una supervivencia completada.
