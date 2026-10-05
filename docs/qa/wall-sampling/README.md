# Muestreo lineal de murallas conservando el lab

La simplificación usa exactamente la elección del punto más distante y el desempate
estricto del Bastion original, mediante intervalos de índices y marcas, sin recortar y
concatenar arrays recursivamente. El remuestreo conserva sus distancias, interpolación,
anchos y límite original por gesto; un cursor monotónico recorre los segmentos una sola
vez. La función de referencia y el HTML del lab permanecen intactos con sus hashes.

La optimización se conecta al wallStroke de producción, usado por la guía ajustada al
presupuesto y la construcción definitiva. No cambia navegación, cobros, reservas,
supresiones, puertas ni colocación. No introduce un cambio visual del trazo.

## Correspondencia con la fuente

[95 pruebas dirigidas](directed.txt) pasan. La nueva prueba ejecuta el HTML original en un contexto
Node independiente y coteja salidas exactas de simplificación (cuatro tolerancias) y
muestreo: 30 curvas de 3000 puntos, cierre alterno, puntos repetidos, cero longitud,
tramos mínimos, extremos y límite de 350 módulos. No se mutan las muestras originales.
Las regresiones cubren puertas mixtas, cierres contra obstáculos, edición, puerta
existente, presupuesto, devolución, cancelación y colisiones.

## CPU aislada

[Datos finales ABBA](cpu-abba.json). Mismo wrapper wallStroke, sustituyendo únicamente
los dos algoritmos por las funciones originales en la referencia. Cuatro series por
caso, 30 calentamientos y 180 mediciones; estructuras existentes vacías para aislar el
trazo. Los resultados son idénticos (hashes de geometría archivados).

| Trayectoria | Completo original (ms) | Completo optimizado (ms) |
| --- | ---: | ---: |
| Corta, 4 puntos | 0,0271 | 0,0285 |
| Suave, 3000 puntos | 3,5980 | 2,8734 |
| Irregular, 3000 puntos | 17,3800 | 14,1208 |

La trayectoria corta tiene una diferencia de 0,0014 ms desfavorable; no se afirma que
todos los casos sean más rápidos. El muestreo aislado de los dos casos largos pasa
respectivamente de 1,4412 a 0,2839 y de 2,6479 a 0,3133 ms. La simplificación y otras
operaciones siguen teniendo coste. [Primer ensayo](cpu-abba-before-simplification.json)
registra la versión previa que solo evitaba los recorridos repetidos de muestreo.

Estos tiempos son CPU del algoritmo en Node con campañas ejecutándose en paralelo,
no frametime integrado, GPU ni FPS de móvil físico. No acreditan ausencia de todos
los tirones en un mapa con miles de murallas existentes.

## Gesto en navegador

[Datos](native-drag.json), [captura](native-drag.png): escena original Sabana/Mapungubwe
semilla 712 en calidad media, centro y 30 semillas pagados, reloj pausado de QA. Un
arrastre real de navegador de (370,480) a (830,480) registra 9 muestras, coloca 7 piezas
nativas y cobra exactamente 70 monedas (550 → 480), sin modal ni errores de fixture o
consola. La captura permite comprobar los módulos colocados. Es un gesto de escritorio,
no una prueba de multitáctil en teléfono; esos gestos se cubren además por regresiones.

Compilación y paquete web pasan: 586 archivos, 407007077 bytes, 839 enlaces relativos
y 20 GLB de ejecución.

Cambios y evidencia en main; no se publica nueva versión en itch.io.
