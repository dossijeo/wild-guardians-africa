# Resultados medidos

CONSERVAR THREE.JS + WEBGL2

48 bloques. Los intervalos Filament cuentan frames enviados, no callbacks RAF omitidos. GPU tiene alcance diferente entre APIs; no se suma a CPU.

| Comparación / escenario / densidad / noche | Three ms | Filament ms | Reducción frametime | Three FPS | Filament FPS |
|---|---:|---:|---:|---:|---:|
| standard/A/1/0 | 26.22–29.54 | 32.18–41.29 | -31.8% | 33.85–38.14 | 24.06–31.07 |
| standard/A/1/1 | 24.56–32.92 | 34.77–39.20 | -28.7% | 30.37–40.72 | 25.26–28.67 |
| standard/B/1/0 | 35.47–46.62 | 53.28–64.57 | -43.6% | 21.45–28.19 | 15.44–18.64 |
| standard/B/1/1 | 37.08–44.51 | 62.72–73.71 | -67.2% | 22.47–26.97 | 13.43–15.84 |
| native/C/0.5/0 | 16.63–16.63 | 16.63–16.68 | -0.2% | 60.14–60.14 | 59.94–60.14 |
| native/C/0.5/1 | 16.63–16.63 | 16.63–16.68 | -0.2% | 60.14–60.14 | 59.94–60.14 |
| native/C/1/0 | 16.63–16.63 | 16.63–16.68 | -0.2% | 60.14–60.14 | 59.94–60.14 |
| native/C/1/1 | 16.63–16.63 | 16.63–16.68 | -0.2% | 60.14–60.14 | 59.93–60.14 |
| native/C/2/0 | 16.63–16.63 | 16.63–16.63 | 0.0% | 60.14–60.14 | 60.14–60.14 |
| native/C/2/1 | 16.63–16.63 | 16.63–16.74 | -0.3% | 60.14–60.14 | 59.74–60.14 |
| expanded/C/1/0 | 16.63–16.63 | 16.63–17.08 | -1.4% | 60.14–60.14 | 58.53–60.14 |
| expanded/C/1/1 | 16.63–16.63 | 16.63–17.14 | -1.5% | 60.14–60.14 | 58.33–60.14 |

Datos y percentiles completos: summary.json y registros crudos por ejecución.
