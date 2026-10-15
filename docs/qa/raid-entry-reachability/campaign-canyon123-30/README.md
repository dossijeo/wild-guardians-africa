# Piloto nativo Gran Cañón/123, política amurallada congelada

Se ejecutó el mismo checkout `d9110380`, genes `service-side`, economía y
presión militar del piloto Sabana/712. Sólo cambiaron bioma y semilla; el
horizonte solicitado fue de 30 noches, con parada únicamente por derrota
nativa o límite computacional. La configuración, hashes de módulos, ledger,
incursiones y decisiones defensivas están en los archivos adjuntos.

| Jornada | Animales | Presión | Golpes a muros | Cultivos destruidos | Cultivos expuestos al ataque | Cultivos vivos al final | Saldo final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 8 | 0,126 | 8 | 13 | 77 | 64 | 416 |
| 7 | 10 | 0,118 | 8 | 13 | 64 | 51 | 464 |
| 8 | 12 | 0,124 | 8 | 22 | 66 | 44 | 336 |
| 9 | 14 | 0,123 | 0 | 37 | 54 | 17 | 375 |
| 10 | 14 | 0,113 | 11 | 18 | 22 | 4 | 188 |
| 11 | 14 | 0,104 | 11 | 15 | 16 | 1 | 92 |
| 14 | 13 | 0,085 | 0 | 6 | 6 | 0 | 87 |

Resultado: **derrota nativa el día 14**, tras 13 noches superadas. Todos
los registros diarios concilian con el ledger. Las noches introductorias
1–5 tuvieron un animal y ninguna pérdida agrícola. La finca empezó a
perder cultivos en la noche 6 y la caída de ingresos y plantilla siguió a
esas pérdidas. La presión normalizada sí descendió al disminuir el valor
agrícola, pero la cantidad de animales pasó de 8 a 14 entre las noches
6 y 9 y todavía fue 13 cuando sólo quedaban seis plantas. Esto describe
el comportamiento de la configuración actual; no se ajustó ningún parámetro.

El jugador virtual pagó 31 módulos de zarzas (310 monedas) y reparaciones,
pero sólo añadió un módulo en el día 7 y ninguno después. El plan registró
rechazos por presupuesto y por piezas sin colocación legal; no hay prueba
de un recinto completamente cerrado. Los animales golpearon muros en las
noches 6–8, 10–11 y 12–13, y también alcanzaron cultivos. La derrota por
ataques es física y auténtica; este piloto **no separa** todavía si la
desventaja proviene de la intensidad militar, de la política defensiva en
el terreno estrecho del cañón o de ambas. No debe tratarse como fallo de
Wild Engine ni utilizarse para modificar el balance desde esta PR.

El archivo `.json.gz` conserva la campaña completa y `summary.json`
clasifica explícitamente la parada como `native-defeat`. El `jsonl` conserva
el avance por jornada. No se ejecutó hasta la noche 30 porque la partida
terminó por las reglas reales del juego.
