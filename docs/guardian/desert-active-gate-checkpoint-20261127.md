# Guardado de la huida activa con portón en Desierto

El guardado público admite el corte de Desierto 983 con un trabajador sano en Home18 y un facóquero en aproximación al centro. En el corte a t=13,76, ambos relojes ya habían avanzado y Home aún reservaba el portón de zarzas `structure-1000000`. El checkpoint acredita el ID del portón y su apertura completa. La autoridad comprueba que el mecanismo nativo, su objetivo y la entidad guardada coincidan en ese instante.

La recarga restituye poses, fases, reserva del blanco y puntos restantes de Home. Crea una época y cuerpos nuevos. WASM vuelve a comprobar los segmentos, el paso por el portón instalado y la separación de corredores antes de adquirir la ruta. Home18 vuelve a acreditar el mismo portón. Home19 retira su cuerpo y el retorno civil enlaza la retirada de esa época. El incremento posterior añade un [guardado cuando el trabajador ya está refugiado](desert-sheltered-raid-checkpoint-20261127.md).

La primera prueba física reprodujo `Native task locomotion source unavailable`. El rig frío podía estar instalando Idle mientras terminaba la descarga de Walk. El control con el rig original fuerza ese orden. Home espera al dueño de Idle, solicita Walk a ese mismo rig y vuelve a verificar la fuente. Se conserva la comprobación estricta del clip, la entidad y el soporte.

## Recarga en NVIDIA

El envío 21, con GO4 a t=13,76, presentó ambos escalares a cero y el mismo portón con apertura 1. El envío 25 mostró ambos escalares en 0,29 s. Home19 retiró el cuerpo 1 a t=15,21. Los cuatro golpes confirmados dejaron 580, 560, 540 y 520 HP. La incursión terminó a t=62,25 y Farm23 adquirió el regreso por el mismo portón a t=65,51. `worker-900011` y `person-5` llegaron a Idle a t=72,96. Draw drenó sin errores.

El arnés comprueba posición y fases exactas en el origen. La comparación del yaw del trabajador admite una diferencia de hasta 1e−12 rad al adquirir Home. El primer contraste físico de la corrección conservó posiciones, fases y edades cero, y observó una diferencia de 3,89e−16 rad al recomputar la orientación del primer segmento.

Los recibos están en `E:/wild-guardians-qa/native-menu-20261126`. El guardado público de CPU `desert-gated-checkpoint.save.json` tiene SHA-256 `b7c02568f4c78ef87610bba734781ec0547a618a85f63e44e8796c60f6176025`. El recibo de la recarga `desert-gated-checkpoint-nvidia-final.json` tiene SHA-256 `fd61e2e58f9672d2520fc9565448b03f62d4b76ff287316f5efce9d830a8a3ad`. La recarga por el Hosted Worker usó las opciones del archivo, sin banderas DEV adicionales. La partida fuente sí se inició con el perfil mixto de calificación. La receta local del arnés está en `.cache/make-desert-gated-checkpoint-audit.mjs`.

## Regresión

```powershell
node --test tests/native-desert-gated-flight-checkpoint.test.js
```

El control usa una partida y navegación reales, ambas conexiones a la autoridad, WASM y un Draw con cola determinista. Rechaza cambios de apertura o identidad en el archivo, conserva poses y apertura mientras READY está retenido y comprueba el primer paquete con los dos relojes y el motor. Verifica Home19, cuatro golpes y el regreso del mismo trabajador a Idle con saldo, salud y contrato intactos.

La selección de vuelo, restauración de Home, portones, checkpoints y roster pasó 198 pruebas de 11 archivos. El build de producción con WebGPU Worker y Draw remoto terminó en 48,64 s. Los recibos son `desert-gated-checkpoint-impact.tap` y `desert-gated-checkpoint-product.log`.

Se compararon imports y exports de ambos WASM con `046498edf`. Los SHA-256 del standalone y pthread son `f97c238492afa9f87216d5a62bce1a98c266d7394f33942e04c1a309372567fd` y `6b859dbd62dee4f04adb07e568eccbfdf92e0b2482e87b2924b43a503f865b40`.

El alcance es un centro en pie, un trabajador, un facóquero, una ruta de Home sin contacto y un portón intacto totalmente abierto. Quedan por calificar el guardado con el motor en tránsito, durante Stop24 y la sustitución de Draw durante la recarga fría.
