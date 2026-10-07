# Piloto de rangos según altura: aceptación pendiente

bc86b8cf mantiene baobabs de altura procedural >=24 m en 200–240 m, y los pequeños en 120–160 m. La clasificación se calcula al preparar datos, con el mismo authored height × sy en sprite, cobertura nativa y banco lógico; no depende de cámara ni cambia el LOD cercano. 63 pruebas dirigidas pasan, incluyendo matrices/ID y complemento de fades con readiness 0/.25/1.

La primera carga nativa compiló sin error GL, pero el botón de órbita encontró una referencia a `a` fuera de su scope al consultar la altura. Informe completo conservado como inválido; no acredita recorrido, aceptación visual ni coste. Se corrige a adapter.adapters[slot] antes de repetir.

La característica permanece OFF en el juego normal. El rango por tamaño es un piloto QA (`large-tree-range=size`), pendiente de readback, movimiento día/noche y ABBA. Los tres procesos de campañas CPU 40968/41304/49032 permanecen de fondo.

Control posterior 2d9b7ecc: órbita pausada en la cámara exacta nocturna de 220 m, GL 0, errores vacíos. Readback del puente conserva 12/12 identidades, matrices y fades; envíos 89.736 triángulos/18 llamadas frente a 93.478/19 históricos. La cobertura 3D del baobab pasa de siete a cuatro filas: solo tres pequeños estaban fuera de 160 m. No demuestra mejora GPU. El campo diagnóstico spriteMix aún utilizaba el rango global y decía 1 para el gigante mientras su rango efectivo era 200–240; se corrige a consultar atributo y uniformes vivos antes de medir. Esta carga no acredita aceptación visual: persisten suelo lejano plano/bruma fuerte y diferencias de silueta.

## Recorridos corregidos sobre 116f2f3d

Se integra main c73a6e90 antes de congelar estas fuentes. Misma cámara nocturna a 220 m: el gigante seleccionado combina sprite .5 / modelo .5; otro gigante modelo .98654, y el pequeño a 211 m mantiene sprite 1 sin draw 3D. Readback real inicial: 12/12 IDs, matrices y fades exactos. El diagnóstico ya lee el atributo de clasificación y los uniformes vivos.

Órbita nocturna, barrido lateral diurno y aproximación diurna completan 20 s cada uno, con cero descensos de readiness del objetivo, estados exactos, GL 0 y consola vacía. La aproximación llega a 25,005741 m y su readback final acredita 3/3 filas actuales. Los readbacks visibles en los otros informes son el control inicial, no nuevas pruebas de sus poses finales. Se conservan todos los descensos globales: 487 + 77 + 62, clasificados por bounds del árbol como offscreen, sin potencialmente visibles ni desconocidos. Esta garantía técnica no acredita por sí sola aceptación artística.

ABBA GPU (A1/B1/B2/A2): **6,321588 / 8,942187 / 8,580104 / 4,475520 ms**. Cada lote contiene 120 muestras; 480 queries, disjoint 0 y estado exacto. A envía 53.762 triángulos/14 llamadas; B 89.737/19. La deriva A1/A2 es importante y no tenemos traza de identidad de todos los draws de sombra; no se atribuye un coste preciso a una categoría ni se recomienda activar. Las tres campañas CPU siguen de fondo. El range por tamaño reduce solo tres filas de la pose comparada y no resuelve el sobrecoste.

Las capturas mantienen limitaciones visuales: bruma muy fuerte, superficie lejana plana y diferencias de silueta/contorno. Feature OFF y PR aún pendiente; esta candidata conserva el handoff, pero no satisface todavía los gates de aspecto y coste.
