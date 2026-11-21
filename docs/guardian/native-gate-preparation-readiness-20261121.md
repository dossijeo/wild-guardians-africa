# Admisión gráfica de una puerta restaurada durante Farm

Farm solicitaba el motor de una puerta recién cargada y recibía `Native gate motor wall not resident`. El diagnóstico encontró el propietario de `structure-1000000` con la entidad intacta confirmada y su raíz todavía invisible. La puerta seguía esperando admisión tras publicar las doce regiones visuales. [Control y diagnóstico](performance/native-gate-preparation-readiness-20261121.json).

Settlements conserva la identidad, la colocación confirmada y el propietario exacto que pide la ruta. Surface usa su espera de publicación para aguardar el mismo slot de pared antes de retener la imagen o reclamar la preparación. Settlements despierta la espera tras sincronizar la visibilidad. La cancelación deja concluir la compilación de la pared. Un cambio de identidad, una retirada o un fallo de ese propietario invalidan su espera. Si una admisión posterior se completa, limpia el error de su slot.

Three r180 asocia la compilación al objeto y al contexto de su escena de destino. Restaura el contexto del renderer y espera las promesas del backend antes de resolver `compileAsync`. Wild Guardians aplica esa frontera al propietario de pared que ya existe y a la espera causal que lo consume. [Three Renderer.compileAsync](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L797-L910).

## Validación física

Edge con NVIDIA Turing dibujó el ticket 2 con el cuerpo 1 y los 32 propietarios de geometría originales. Farm esperó mientras se abría la hoja, mantuvo la ruta adquirida y avanzó de `z=11.8` a `z=7.705`. El binding de dibujo presentó la apertura en 1 sobre la raíz y geometría originales de la puerta. La trayectoria pasó por `x=-14`, fuera del marco de la puerta situada en `x=-11.8`. Quedan por comprobar el paso por el vano, la compra de una puerta durante Farm y C4.

Hubo 182 dibujos del ticket, un máximo de 37,6 ms entre dibujos a 30 Hz y cero errores WebGPU. El consumidor confirmó el drenaje. [Recibo de NVIDIA](performance/native-gate-preparation-readiness-20261121.json).

## Pruebas dirigidas

```powershell
.cache/tooling/node20.exe --test tests/native-gate-preparation-readiness.test.js tests/webgpu-wall-admission.test.js tests/webgpu-settlement-admission.test.js tests/native-farm-restored-gate.test.js tests/native-gate-owned-proxies.test.js tests/native-farm-restored-authority.test.js
```

Los controles con el compilador retenido usan los assets originales y comprueban espera, continuidad del propietario, cancelación, sustitución, fallos aislados y recuperación del mismo slot.

Pasaron las 84 pruebas dirigidas del checkout. La compilación de producción con WebGPU Worker y dibujo remoto completó el empaquetado de recursos.
