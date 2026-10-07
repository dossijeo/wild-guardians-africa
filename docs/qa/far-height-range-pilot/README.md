# Piloto de rangos según altura: aceptación pendiente

bc86b8cf mantiene baobabs de altura procedural >=24 m en 200–240 m, y los pequeños en 120–160 m. La clasificación se calcula al preparar datos, con el mismo authored height × sy en sprite, cobertura nativa y banco lógico; no depende de cámara ni cambia el LOD cercano. 63 pruebas dirigidas pasan, incluyendo matrices/ID y complemento de fades con readiness 0/.25/1.

La primera carga nativa compiló sin error GL, pero el botón de órbita encontró una referencia a `a` fuera de su scope al consultar la altura. Informe completo conservado como inválido; no acredita recorrido, aceptación visual ni coste. Se corrige a adapter.adapters[slot] antes de repetir.

La característica permanece OFF en el juego normal. El rango por tamaño es un piloto QA (`large-tree-range=size`), pendiente de readback, movimiento día/noche y ABBA. Los tres procesos de campañas CPU 40968/41304/49032 permanecen de fondo.

Control posterior 2d9b7ecc: órbita pausada en la cámara exacta nocturna de 220 m, GL 0, errores vacíos. Readback del puente conserva 12/12 identidades, matrices y fades; envíos 89.736 triángulos/18 llamadas frente a 93.478/19 históricos. La cobertura 3D del baobab pasa de siete a cuatro filas: solo tres pequeños estaban fuera de 160 m. No demuestra mejora GPU. El campo diagnóstico spriteMix aún utilizaba el rango global y decía 1 para el gigante mientras su rango efectivo era 200–240; se corrige a consultar atributo y uniformes vivos antes de medir. Esta carga no acredita aceptación visual: persisten suelo lejano plano/bruma fuerte y diferencias de silueta.
