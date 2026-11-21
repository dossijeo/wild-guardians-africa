# Restauración de una reparación de puerta en curso

El guardado público de una reparación de zarzas a t=17,40 conserva la curva que empezó en t=17,25, los 60 HP y la apertura confirmada en 1. Al restaurar ese checkpoint, la admisión inicial prepara el mismo morph de GPU que usa Repair durante la partida. La curva conserva sus 480 ms y Game conserva el único evento `RepairApplied` y el débito de cinco monedas. [Control anterior](performance/native-gate-repair-active-restore-baseline-20261121.json).

La capa de morph usa el inicio y los extremos guardados con el reloj confirmado de presentación. El dueño inicial conserva la apertura guardada hasta que una ruta adquiere un motor nativo. Un motor preparado hereda la curva y puede revertir su activación. La retirada diferida libera sus materiales y geometría mediante la preparación de pared existente. Una apertura que cambia sin su preparación nativa y un dueño sin reloj confirmado se rechazan.

Godot evalúa la pose en `AnimationPlayer::seek_internal` al establecer el tiempo guardado y procesar con delta cero. Three aplica el tiempo indicado en `AnimationMixer::setTime`. Wild usa esa separación entre evaluación y efectos con la curva y el reloj de presentación existentes. [Godot 4.4 AnimationPlayer](https://github.com/godotengine/godot/blob/4.4-stable/scene/animation/animation_player.cpp), [Three r180 AnimationMixer](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js#L716).

## Validación

El primer dibujo comprobado en NVIDIA Turing presentó t=17,3999996. Las dos piezas usaron dos shaders de morph y dos buffers intercalados, uno por geometría. Posición, normal y las bases del morph conservaron sus versiones mientras seguían residentes. Las dos piezas mantuvieron la forma gobernada por la curva hasta que la malla sana se observó a t=18,55. La raíz siguió siendo 518.

La traza registró una llamada `destroy` por cada buffer de morph una vez sustituida su malla. Se conservaron 790 buffers comparables, con cero sustituciones. El saldo siguió en 99.995 y el consumidor drenó sin errores. El máximo de 36,9 ms a 30 Hz se registró en el arranque y sigue sin atribución. [Recibo](performance/native-gate-repair-active-restore-20261121.json).

La prueba física cubre zarzas con apertura guardada estática. Las pruebas de componentes cubren los tres materiales, pausas, selección, transferencia y reversión del motor, y disposición diferida. Pasaron 123 pruebas en 17 archivos y el build de producto con worker WebGPU terminó en 52,08 s. Quedan restaurar una puerta con el motor en movimiento, Repair que recupera una colisión y C4.
