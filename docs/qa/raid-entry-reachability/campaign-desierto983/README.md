# Piloto nativo de 14 noches: entrada alcanzable

Esta es una prueba de impacto de la PR #46, **no una propuesta de balance**. Se
tomó la política congelada del laboratorio evolutivo (`4133f914`) y se aplicó
únicamente el commit de entrada `99aa7015`; el checkout de ejecución quedó en
`d9110380`. Los dos brazos usan Desierto/Mapungubwe, semilla 983, economía,
magias, daño y composición de incursiones idénticos. Cambia sólo la decisión
jugable de construir/reparar murallas (`service-side` frente a `no-walls`).
`config.json` conserva parámetros y hash de fuente; los JSON comprimidos
incluyen jornadas, recibos nativos, oleadas y decisiones defensivas. Todas las
jornadas concilian con el libro mayor. El runner es
`tools/evolutionary-balance/run-post-intro-pilot.mjs` de la rama de balance;
este commit de QA no añade ese laboratorio a la rama de producción.

| Brazo | Noches superadas | Saldo al caer | Cultivos vivos | Cultivos destruidos, noches 6–13 | Golpes a muros | HP perdido por muros | Muros pagados |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Murallas `service-side` | 12 | 372 | 48 | 184 | 106 | 2456 | 22 piezas / 220 monedas |
| Sin murallas | 12 | 225 | 1 | 274 | 0 | 0 | 0 |

La noche 6 es especialmente diagnóstica. El brazo con murallas recibió 13
golpes agrícolas y 16 estructurales, perdió 360 HP de muros y cuatro piezas
quedaron arruinadas. Sin murallas recibió 26 golpes agrícolas y tres fueron
interceptados por escudos. Los ocho animales agotaron sus 29 golpes en ambos
brazos mediante ataques nativos; ninguno se retiró por espera. Las murallas
sí redujeron las bajas agrícolas de esa noche, pero su cobertura y reparación
no bastaron para sostener este perfil hasta la noche 14. La derrota de ambos
brazos fue nativa, no un timeout ni una parada económica artificial.

Comparación histórica: en el piloto previo, con el mismo perfil/semilla pero
sin la corrección de entrada, ambos brazos sobrevivieron 14 noches. La primera
oleada de las noches 6–10 del control sin muros se retiraba sin contactos.
Por ello, el aumento de presión aquí es una consecuencia real de corregir las
entradas inalcanzables; las cifras previas no pueden usarse para aprobar el
balance militar. No se debe concluir que todas las fincas amuralladas pierdan
ni que la tasa de victoria a 100 noches sea cero: esto es una sola semilla y
una política defensiva experimental.

Los tiempos `Game.tick` por jornada están en los informes completos. Entre
los días 6 y 13 fueron aproximadamente 2,95–5,06 s para `service-side` y
1,53–2,38 s sin murallas, dentro del presupuesto de 60 s por día del piloto.
La diferencia de carga incluye más estructuras y decisiones de defensa, no
puede atribuirse sólo al selector de entrada. Antes de integrar la PR #46 en
`main` conviene repetir un perímetro cerrado y al menos otra semilla/bioma,
comprobando la certificación exterior, brechas y entradas físicamente válidas.
