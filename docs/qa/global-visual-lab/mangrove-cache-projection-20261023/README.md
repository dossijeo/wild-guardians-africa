# Plan de cache por proyeccion (sin asignacion GPU)

Experimento QA sobre la escena real Manglares fixture712.25bounds de geometria registrados una vez;120posiciones de camara por vista normal,cercana,elevada. Usa jacobiano proyectado del plano horizontal, puntos del chunk y9rayos de viewport. Incluye fallback para franjas de frustum que no contienen probes; la primera tentativa las omitia y se corrigio antes de conservar este resultado.

Seleccion provisional: noise128 para mas de55pixels/metro (sale a45), pesos128/256/512 segun48m*densidad proyectada, con histeresis1.2/.7 para resolucion. No se consulta Engine ni entidades por fotograma. Los bounds requieren actualizacion por eventos al reconstruir chunks; este experimento registra una escena fija.

|Vista|Chunks candidatos|Memoria proyectada MiB|CPU media ms|CPU p95 ms|
|---|---|---|---:|---:|
|normal|[6, 10]|[6.801, 10.917]|0.0483|0.1000|
|near|[3, 9]|[1.515, 10.831]|0.0117|0.1000|
|elevated|[2, 6]|[2.686, 8.059]|0.0108|0.1000|

Memoria calculada para las texturas seleccionadas y mipmaps, NO medicion de residencia real: excluye recursos ocultos retenidos, solapamiento durante transiciones y overhead del driver. CPU es un bucle QA en pagina, con resolucion temporal limitada: no demuestra coste durante streaming real.128/256/512 estan disponibles pero esta escena selecciona principalmente512; no se fuerzan niveles inferiores solo para ahorrar memoria.

```sh
node tools/experiments/measure-mangrove-cache-projection-20261023.mjs
```
