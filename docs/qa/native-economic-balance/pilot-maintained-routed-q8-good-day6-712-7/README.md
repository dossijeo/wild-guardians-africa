# Repetición con mantenimiento del perímetro pagado

Fuente congelada `f8542c59`. Mismos siete días, semilla 712, Sabana/Mapungubwe,
Q8 y estrategia buena que el piloto `ed541269`. Solo cambia la decisión de
defensa: mientras las plantas y centros permanecen dentro del trazado pagado,
se mantiene ese recinto y se solicitan reparaciones/reconstrucciones nativas.
No se compra otro más exterior para evitar las piezas dañadas del primero.
La ampliación sigue disponible cuando el área agrícola sale del perímetro.

Los seis primeros registros diarios coinciden exactamente con `ed541269`;
los cinco primeros también coinciden con el control que no construyó murallas.
Todos los días concilian con el ledger, sin créditos ficticios ni cobros dobles.

| Día 7 | Mantenimiento corregido | Anterior trazado | Control sin murallas efectivas |
| --- | ---: | ---: | ---: |
| Saldo final | 429 | 318 | 589 |
| Cultivos vivos | 176 | 99 | 191 |
| Brotes comprados | 79 | 0 | 50 |
| Cajas entregadas | 55 | 55 | 56 |
| Murallas compradas ese día | 0 | 480 | 0 |
| Reparaciones efectivamente cobradas | 49 | 64 | 0 |
| Cultivos destruidos en la incursión | 2 | 0 | 15 |
| Inactividad diaria | 72,33 % | 93,33 % | 82,00 % |

El coste total de murallas baja de 950 a 470 monedas: 47 piezas reales. La
noche 6 mantiene cero bajas agrícolas, 25 golpes contra murallas y 565 HP
estructurales perdidos. La noche 7 registra dos bajas agrícolas, 27 golpes
contra murallas, 612 HP perdidos y tres contactos con escudo. Todos los
presupuestos de golpes se consumen. Las pérdidas no se ajustan sintéticamente.
La composición puede variar por el diferente valor agrícola: es una comparación
de estrategias con el mismo generador, no una composición fija de laboratorio.

**Todavía no aceptado:** inactividad agregada 73,43 %, superior al 25 %.
No se amplía a cien noches ni se declara victoria económica. Revisar la
productividad/contratación y las decisiones de cultivo con precios constantes
antes de lanzar otra versión congelada. Falta cobertura de las demás semillas
y horizontes para cualquier conclusión general.

Evidencia completa en los JSON, journal y guardado de esta carpeta;
`comparison.json` compara los tres casos y conserva hashes de sus informes.
Comando igual al piloto anterior sustituyendo `--out` por esta carpeta.
Diez pruebas de financiación/trazado/mantenimiento aprobadas; incluyen una
muralla destruida por `hitStructure` que genera mantenimiento sin segunda
compra de perímetro. No es un benchmark GPU ni una integración en `main`.
