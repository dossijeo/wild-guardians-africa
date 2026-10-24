# Manglares: solapamiento geometrico del suelo

Fixture 712 pausada, calidad media, 1280x720. Dos vistas: normal y elevada a 38 m. Se copian las matrices y geometria de los 25 suelos y 24 overlays de barro residentes a una escena temporal, con acumulacion aditiva en canales separados, sin profundidad. Se leen los pixels; el material de produccion no se altera.

|Vista|Pixels suelo|Contribuciones suelo|Pixels barro|Maximo capas suelo/barro|
|---|---:|---:|---:|---|
|Normal|921226|921226|67521|1 / 1|
|Elevada|921600|921600|86545|1 / 1|

El suelo proyectado llena practicamente la pantalla y no presenta solapamiento consigo mismo en estas vistas. El barro agrega una huella del 7.33% / 9.39% de la pantalla, enteramente sobre suelo. No se observan capas duplicadas de chunks.

Esto mide cobertura geometrica sin oclusion de otros objetos, NO invocaciones reales de fragment shader ni rechazo early-Z. No cuantifica el overdraw de vegetacion ni el trabajo ejecutado debajo de edificios. El contador RGBA8 satura en 255, pero el maximo observado es 1 por categoria. No constituye una medicion temporal ni una prueba exhaustiva de todas las camaras.

Reproducir con Vite5190:
```sh
node tools/experiments/measure-ground-coverage-20261023.mjs
```

Resultado completo en audit.json; cero errores. Targets y materiales temporales se liberan; geometria prestada se conserva.
