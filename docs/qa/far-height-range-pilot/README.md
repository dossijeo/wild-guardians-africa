# Piloto de rangos según altura: aceptación pendiente

bc86b8cf mantiene baobabs de altura procedural >=24 m en 200–240 m, y los pequeños en 120–160 m. La clasificación se calcula al preparar datos, con el mismo authored height × sy en sprite, cobertura nativa y banco lógico; no depende de cámara ni cambia el LOD cercano. 63 pruebas dirigidas pasan, incluyendo matrices/ID y complemento de fades con readiness 0/.25/1.

La primera carga nativa compiló sin error GL, pero el botón de órbita encontró una referencia a `a` fuera de su scope al consultar la altura. Informe completo conservado como inválido; no acredita recorrido, aceptación visual ni coste. Se corrige a adapter.adapters[slot] antes de repetir.

La característica permanece OFF en el juego normal. El rango por tamaño es un piloto QA (`large-tree-range=size`), pendiente de readback, movimiento día/noche y ABBA. Los tres procesos de campañas CPU 40968/41304/49032 permanecen de fondo.
