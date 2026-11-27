# Guardado entre la parada nativa y Home18

El guardado público admite al trabajador que ya tiene una solicitud Home v2 después de la parada nativa mientras la ruta Home18 sigue pendiente. El archivo conserva la pose detenida, las fases y el presupuesto de carrera, el nacimiento de la incursión, el refugio, el contrato y la reserva del animal. En Desierto guarda además el portón instalado y su apertura estable.

El checkpoint indica que Home sigue pendiente. Al cargar, la autoridad declara una nueva solicitud para ese mismo refugio y WASM vuelve a planificar desde la pose guardada. Home y el animal pasan por su preparación gráfica y adquieren tickets de la nueva época. El READY de la sesión anterior y el programa de movimiento de Home quedan fuera del archivo. El guardado sigue bloqueado mientras Stop24 aún está pendiente de adquisición.

## Recarga en NVIDIA

La partida de Desierto 983 cargó el corte t=13,60 del guardado público en CPU. Las dos primeras preparaciones fueron Home18 y la aproximación al centro. El envío 19 presentó ambos relojes a cero y el mismo portón totalmente abierto. Home19 retiró al trabajador a t=15,25. El centro terminó en 520 HP tras cuatro golpes, la incursión concluyó a t=62,84 y el regreso por el mismo portón llegó a Idle a t=74,05. Draw drenó sin errores.

La solicitud nueva conservó el yaw detenido de π. En el primer dibujo de Home, el trabajador ya miraba en la dirección de partida del corredor, −0,0372343136 rad. El primer contraste del arnés comparó el dibujo con el yaw detenido. La comprobación final acredita el yaw original en la solicitud y el del corredor en el dibujo, además de posiciones y fases exactas.

Los archivos están en `E:/wild-guardians-qa/native-menu-20261126`. El guardado `desert-pending-home.save.json` tiene SHA-256 `c70117c136ac9f42b737cbc7a7a8b9d07b3817cab8552540a6a953a9c91e7ba2`. El recibo `desert-pending-home-nvidia-verified.json` tiene SHA-256 `888c78c214887da480e05d3e924820ee3147c6114289577fdfc9381c0d6d36f2`. La receta local es `.cache/make-desert-pending-home-audit.mjs`.

## Controles

```powershell
node --test tests/native-desert-gated-flight-checkpoint.test.js tests/native-farm-raid-flight-savanna.test.js
```

El negativo de Desierto a t=13,60 devolvía `physics-active` con Stop24 confirmado y READY de Home retenido. El control de CPU guarda antes de READY y con READY retenido, verifica que ambos actores conserven sus poses durante la nueva espera y completa Home19, cuatro golpes y el regreso por el portón original. Rechaza un archivo que combine una declaración Home pendiente con un corredor de Home adquirido.

En Sabana, el facóquero puede adquirir la marcha hacia un cultivo antes que Home. El guardado acepta ese corte cuando la pose, fase y tiempo de ejecución publicados coinciden con WASM. Si la ruta ya adquirió GO pero Game todavía no proyectó ese origen, el guardado se rechaza. El control con Home pendiente recarga desde una fase de marcha mayor que cero y confirma los dos golpes a cultivos y el regreso civil.

Pasaron 71 pruebas de cinco archivos. El build de producción con WebGPU Worker y Draw remoto terminó en 51,34 s. Los recibos son `desert-pending-home-impact-final.tap` y `desert-pending-home-product.log`.

Ambos WASM mantienen sus imports y exports respecto de `71679774a`. El standalone tiene SHA-256 `17900baa12278d3350576e28fa929c64ebce98b19c8684d63e90f694833626ca` y el pthread `226d9d4aa4af07c9a33987a5a1fd54dc5f457fce1cdcf64a5d5c417acd4f5e3c`.

El portón en tránsito y el guardado antes de tener una parada confirmada quedan fuera de este recorrido.
