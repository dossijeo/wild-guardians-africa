# Adopción de los proxies nativos de una puerta

El primer control de compra alcanzó el commit nativo y falló al proyectar el espejo porque este volvía a calcular la huella en JavaScript. En la puerta de zarzas en `x=-11.8, z=8.2` con yaw 0, el semiancho izquierdo calculado por JavaScript era `0.42091473937034607`. El de WASM era `0.42091476917266846`. Las otras 17 cotas del recibo original coincidían.

La variante de puerta usa el triplete preparado por WASM como geometría física. El espejo coteja los IDs y las dimensiones con el resultado adquirido y usa esas dimensiones para registrar los límites y la revisión.

La referencia v2 conserva x, z, yaw y las escalas de la cotización, además del modelo, el ID del mecanismo, la apertura, las matrices y los proxies nativos. La autoridad y Surface comprueban el emplazamiento antes de adquirir. El espejo coteja la frontera, los IDs y la pose adquirida mediante `nav_gate_mechanism_pose`.

```powershell
.cache/tooling/node20.exe --test tests/native-gate-proxy-adoption.test.js tests/native-wall-adoption.test.js
```

Dos pruebas nuevas pasan sobre WASM real: la diferencia exacta de un ULP ya no impide adoptar; sync no crea otra barrera; se rechazan proxies alterados un ULP, IDs ajenos, posición/yaw cambiados y mecanismo/matriz de hoja alterados. Cuatro regresiones existentes del espejo pasan. El padre falla la prueba positiva con `Native wall footprint differs from its committed ID` (1 fallo esperado, 1 prueba omitida por filtro). Logs `.cache/native-gate-proxy-adoption.log`, `-parent.log` y `-regression.log`.

La compra ordinaria también pasó en NVIDIA sobre el mismo equipo y la ruta de Farm siguió avanzando. [Recibo de compra](native-gate-addition-20261121.md).
