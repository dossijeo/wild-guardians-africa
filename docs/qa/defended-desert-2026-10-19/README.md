# Desierto/123: formación exterior y campaña defendida

Esta comprobación usa Wild Engine en `d522cd97` más la corrección de la PR
experimental, estrategia `good`, cultura Mapungubwe, defensa topológica,
intenciones y planes de muralla nativos y las reglas de producción. No incluye
Three.js, VFX ni overlays. El WASM de las tres ejecuciones tiene SHA-256
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.
El runner conserva SHA-256
`745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`.

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs desierto 100 123 test-results/desierto-123.json topological
```

| Variante | Resultado real | Noches registradas | Causa de parada |
| --- | --- | ---: | --- |
| `main` previo | Error técnico | 8 | La noche 9 no encontraba formación completa para cinco facóqueros; `raid` seguía `null` tras el límite de observación. |
| Primera corrección | Error técnico | 27 | Una consulta opcional de desvío hacia un sector no residente lanzó `SpatialChunkUnavailable` al preparar la siguiente oleada de la noche 28. |
| Ambas correcciones | Victoria | 100/100 | Las cien incursiones quedaron verificadas, sin incidencias de evidencia. |

Los tres informes íntegros están en
[`baseline-night9-stall.json.gz`](baseline-night9-stall.json.gz),
[`night28-unknown-detour.json.gz`](night28-unknown-detour.json.gz) y
[`desierto123-100-nights.json.gz`](desierto123-100-nights.json.gz).
Los SHA-256 del JSON descomprimido son, respectivamente,
`a57d2cc4d19f11007e664d1c78a31fa8277d9e63a418b13da9c93c283c123246`,
`4c1ce31554e731bb469678c780ec1aab419a4dbfb2d00afaa919427377fe5c2d`
y `2cc6bebaed38f1ca77073dd62392d8fd1c3168a9e23ab28c42424e67d43aeb97`.
Los guardados reales de los dos errores son las fixtures
[`desierto123-d9-exterior-formation.json.gz`](../../../tests/fixtures/desierto123-d9-exterior-formation.json.gz)
y [`desierto123-d28-exterior-unknown.json.gz`](../../../tests/fixtures/desierto123-d28-exterior-unknown.json.gz).

## Causa y contrato físico

La búsqueda inicial seleccionaba posiciones válidas una a una cerca de la
cámara, pero la formación codiciosa no encontraba sitio para el quinto animal
junto a una finca cerrada. La nueva alternativa excepcional examina un máximo
de 256 anclas ordenadas alrededor del perímetro construido. Cada candidato
utiliza la misma comprobación de la cámara para un animal del radio más grande
del grupo, una prueba positiva de exterior, separación corporal y el
certificado físico del grupo completo. No reduce la oleada, no desplaza
animales a través de muros y no cambia las reglas de ataque. Si no encuentra
la formación, la incursión sigue pendiente.

El segundo error procedía de `prepareExteriorDetour()`: una ruta especulativa
podía terminar en terreno todavía no residente. Ahora esa candidata se deja
sin certificar y se prueban las demás. `unknown` no se convierte en `blocked`;
los demás errores siguen propagándose. Los dos estados congelados comprueban
que elegir posiciones no modifica el estado confirmado, que las entradas
están fuera de las defensas, son transitables y están separadas, y que se
mantienen todos los animales de la oleada.

## Resultado de campaña y límite de balance

La ejecución final tardó 916,4 s de reloj, de los cuales 700,3 s correspondieron
a `Game.tick` y 175,6 s a decisiones del bot. Es una observación de campaña,
no un benchmark A/B controlado; durante parte de la ejecución se corrieron
pruebas y un build en el mismo equipo.

| Noches | Media de cultivos vivos | `Game.tick` acumulado | Cultivos destruidos por incursiones | Golpes a murallas |
| --- | ---: | ---: | ---: | ---: |
| 1–20 | 42,4 | 42,3 s | 1 | 39 |
| 21–40 | 71,7 | 140,6 s | 0 | 9 |
| 41–60 | 74,9 | 166,0 s | 0 | 5 |
| 61–80 | 75,2 | 165,3 s | 0 | 3 |
| 81–100 | 74,3 | 186,1 s | 0 | 12 |

La finca terminó con 70 cultivos y 132.822 monedas. Compró 197 piezas de
muralla por 1.970 monedas y solicitó 147 reparaciones. **Esta victoria no
acredita el equilibrio militar del Desierto**: un solo cultivo destruido y
68 golpes a murallas en cien noches indican una presión efectiva muy baja en
esta combinación de semilla, terreno y política. Debe investigarse por separado
si los animales alcanzan objetivos relevantes y comparar estrategias y
semillas; no se debe alterar el motor físico para fabricar más pérdidas.

Como contraste de acceso, una ejecución independiente de la misma semilla,
estrategia y motor **sin comprar murallas** terminó derrotada después de 26
noches completas, durante la jornada 27: 220 cultivos destruidos en 27
incursiones verificadas, cero cultivos vivos y 156 monedas. El informe está en
[`desierto123-no-walls-30.json.gz`](desierto123-no-walls-30.json.gz)
(SHA-256 del JSON descomprimido
`3996876613610972c38a7c70908e2a0a0f5c053684530acc1a7182b5421d9478`).
Se reproduce con:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs desierto 30 123 test-results/desierto-no-walls.json no-walls
```

El modo `no-walls` conserva las reparaciones ordinarias de centros, pero
desactiva la inversión defensiva. Es una **política distinta**, no un A/B de
rendimiento ni una prueba de que cada incursión tardía frente a la finca
amurallada haya encontrado un objetivo útil. Sí demuestra que el terreno por
sí solo no hace invulnerable la plantación en esta semilla.

Pasaron las 41 pruebas existentes de entrada exterior, conectividad y entrada
de Desierto, las dos regresiones congeladas y la prueba de desvío desconocido.
El build de producción pasó. Esta evidencia no sustituye pruebas visuales,
fluidez interactiva ni otras campañas de balance.
