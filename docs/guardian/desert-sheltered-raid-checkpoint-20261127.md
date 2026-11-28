# Guardado de la incursión de Desierto después de Home19

En Desierto 983, el trabajador ya refugiado conserva su persona, contrato, pueblo y pose una vez retirado su cuerpo por Home19. El guardado público puede capturar ese estado durante la aproximación al centro, un golpe adquirido o Retreat. También guarda la identidad y la apertura estable del portón instalado. La captura comprueba la muestra de la autoridad nativa y rechaza un motor en transición.

Al recargar, WASM acredita la ausencia del trabajador en la nueva época antes de publicar el cuerpo del facóquero. La aproximación y Retreat vuelven a comprobar el corredor restante. Un golpe adquirido conserva su ID, clip, duración y tiempo restante. El primer dibujo del programa restaurado espera su propia preparación y usa la edad física de esa adquisición. Tras `RaidEnded`, Farm23 usa el recibo de ausencia de la nueva época para admitir un cuerpo nuevo y volver por el mismo portón.

## Recargas en NVIDIA

Los tres primeros envíos conservaron apertura 1, la ausencia de `worker-900011` y edad relativa cero de la adquisición. El golpe restaurado `attack-29209` conservó 1,421666705 s pendientes de 1,541666705 s. Los tres recorridos dejaron el centro en 520 HP, verificaron cuatro golpes con IDs distintos, confirmaron el regreso de `person-5` por el portón original y drenaron Draw.

| Fase guardada | Hora del corte | Primer envío | RaidEnded | Idle |
| --- | ---: | ---: | ---: | ---: |
| Aproximación | 15,08 | 17 | 62,42 | 74,08 |
| Golpe | 36,40 | 28 | 62,49 | 74,25 |
| Retreat | 48,36 | 13 | 56,08 | 67,61 |

La incursión original pertenece al perfil mixto de calificación. Los guardados se generaron con el coordinador público en CPU. El Hosted Worker cargó los archivos con las opciones del checkpoint y sin banderas DEV adicionales. El arnés mantuvo suspendido el avance hasta confirmar el GO y publicó un snapshot posterior para que Surface confirmara la adquisición. La receta `.cache/make-desert-refuge-audit.mjs` registra el IntentBaseline de Draw y el primer envío. El primer contraste había observado el GO sin publicar ese snapshot. Otro contraste registró el envío pero buscó el IntentBaseline en la rama que recibe transiciones posteriores. Ambos ajustes fueron del arnés.

Los recibos `desert-refuge-{approach,strike,retreat}-nvidia-verified.json` están en `E:/wild-guardians-qa/native-menu-20261126`. Sus SHA-256 respectivos son `91e8ecaa73064cc1df1d30e965106bc6864143ae2f3dea0b073b90451be46792`, `93340ad13903488e023f0fccf37e542335a062480440041b910273aed19f858c` y `62c9e018287bc4e3d58e7672c2f9c82c66c726b05824220f0a6db9d74ac18786`.

## Regresión

```powershell
node --test tests/native-desert-gated-flight-checkpoint.test.js
```

Antes del cambio, el guardado de la partida recargada rechazaba el primer corte después de Home19 a t=15,08 con `physics-active`. El control integrado cubre guardados en las tres fases con Game, WASM y los dos puertos de producción. Comprueba que el trabajador sigue ausente y que el animal mantiene su pose y el reloj del golpe con READY retenido. Rechaza una apertura alterada en el archivo. Los tres recorridos completan cuatro golpes con IDs únicos, el saldo original y el regreso a Idle.

Pasaron 69 pruebas de cinco archivos. El build de producción con WebGPU Worker y Draw remoto terminó en 46,47 s. Los recibos son `desert-refuge-impact.tap` y `desert-refuge-product.log`.

Se compararon los imports y exports de ambos WASM con `087a36ff9`. El standalone tiene SHA-256 `cba667b9721dc02ce19aa5168aa7f44bffb94a192f4bcc2c5bce98c5852c6610` y el pthread `88f093d412874fcaef9e6e4be76a59c5a222827fb9f38bbdcab9234bc691e87d`.

El alcance es un trabajador sano refugiado durante una incursión diurna de un facóquero al centro. El guardado con el motor en tránsito y la recuperación de una pérdida de Draw desde estos checkpoints siguen pendientes.
