# Coste de integración frente a receta QA completa

Intel UHD0x9A60 ANGLE D3D11,1280×720, perfil baja, semilla712, movimiento de cámara día/noche, simulación pausada. A/B/A/B, calentamiento180 y240muestras por modalidad y bloque.1920muestras GPU válidas y1920fotogramas de cadencia, sin errores/disjoint. Auditoría verifica cámara, calls y triángulos por fotograma iguales, estado simulado estable y mismo dispositivo.

A=recetaQA completa con ayudante de bordes; B=opción integrada sin ayudante. Ambas conservan calidad aprobada. Este benchmark no compara con musgo original ni cuantifica sobrecoste de activar la mejora desde default.

| Métrica | QA completa | Integrada |
|---|---:|---:|
| GPU día, ms |13.111 /13.886 |12.881 /13.739 |
| GPU noche, ms |13.420 /15.140 |15.203 /14.852 |
| CPU render día, ms |4.322 /4.630 |5.403 /4.765 |
| CPU render noche, ms |4.120 /4.552 |4.937 /4.689 |
| Cadencia p95 día, ms |48.6 /54.9 |63.6 /53.9 |
| Cadencia p95 noche, ms |52.2 /56.4 |53.5 /53.3 |

GPU día−.229/−.147ms; noche+1.782/−.288ms, inconsistente. CPU integrada superior en los cuatro pares, de+.134 a+1.081ms; no afirmar neutralidad de coste ni descartar regresión. También cambia CPU del agrupador, ajeno al material; no atribuir causalmente ese cambio al shader. No se ha aislado causa ni construido intervalo de confianza con dos repeticiones. Picos de cadencia elevados en ambos, especialmente primer bloque integrado diurno.

Decisión: conservar la receta artística integrada como opción experimental; no promover por rendimiento ni cambiar defaults. Repetir una medición controlada del coste CPU y revisar cambios de calidad en caliente antes de cerrar validación. No reducir calidad visual para hacer pasar el benchmark.

Los tiempos GPU son consultas de render; CPU excluye simulación; cadencia no es presentación. No VRAM medida. Perfil muy_baja tiene seis capturas sin errores, pero este benchmark pertenece a baja y no prueba su presupuesto.

Reproducir con `node tools/experiments/measure-mangrove-full-integrated.mjs` y `python tools/experiments/audit-mangrove-full-integrated.py`, Vite5190. Datos completos locales benchmarks.json y resumen versionado summary.json.
