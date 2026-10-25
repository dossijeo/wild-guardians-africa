# Diagnóstico de contención GPU

Observación de solo lectura el21/10/2026,17:28:06–17:28:22UTC,sin benchmark propio ejecutándose. Ocho muestras de Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine. El proceso40308,Chrome GPU,usa10–95% del motor3D del adaptador observado. Su padre es Chrome headless5336 ysu propietario node23948 ejecuta tools/experiments/measure-wild-renderer.mjs. Hay también carga menor de otros procesos. Datos en samples.json;no se guardan líneas de comandos completas ni argumentos privados.

Una lectura preliminar marcó87%. Plan de energía observado:Equilibrado;no se cambió. No se cerró ningún proceso ni se enviaron mensajes a otras conversaciones.

Conclusión:hay una prueba concurrente con carga GPU importante yvariable. No procede ejecutar ahora benchmarks de precisión del laboratorio esperando aislamiento. Esto ofrece una causa plausible de inestabilidad,pero no demuestra coincidencia temporal con cada ronda pasada ni permite corregir sus resultados retrospectivamente. Las capturas y validaciones de geometría siguen siendo evidencia visual;las conclusiones causales de rendimiento deben permanecer limitadas.

Antes del siguiente benchmark:muestrear carga,identificar propietario de procesos activos yesperar a que termine la carga ajena mediante observaciones reales. No terminar pruebas de otro trabajo. Registrar otra ventana inmediatamente antes ydurante la medición;porcentajes bajos tampoco prueban aislamiento perfecto. Los contadores son por motor,no deben sumarse como porcentaje global,yson muestras de scheduling,no tiempos GPU del juego.

```text
powershell -NoProfile -ExecutionPolicy Bypass -File tools/experiments/sample-gpu-contention-20261021.ps1 -OutputPath docs/qa/global-visual-lab/NUEVA-CARPETA/samples.json
```

El muestreador rechaza sobrescribir archivos. Las muestras usan fecha real;el intervalo solicitado de1s aumenta por consultas CIM. No calcular FPS de estos contadores. Mientras exista contención,continuar trabajo artístico yvalidación funcional,conservando pendientes los costes fiables.
